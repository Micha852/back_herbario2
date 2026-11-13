import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../database/prisma.service';
import { decryptSecret, encryptSecret } from '../../common/utils/secret-box';
import { herbariumName, TenantContext } from '../../tenancy/tenant-context';

/**
 * Envío de correos por SMTP. La configuración sale, en este orden, de:
 *  1. El panel (Correo, solo ADMINISTRADOR): system_info "correo", contraseña cifrada.
 *  2. El .env (MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD, MAIL_FROM).
 *  3. Ninguna: modo consola. Fuera de producción el correo se escribe en la consola del
 *     back (para probar códigos y contraseñas temporales); en producción se rechaza.
 *
 * Importante: escapar con escapeHtml() todo dato del usuario que vaya en el HTML.
 */

export const MAIL_SETTINGS_KEY = 'correo';
/** Correo dentro de un encabezado From ("Nombre <correo@x.co>" → "correo@x.co") */
const emailOf = (from?: string) => from?.match(/<([^>]+)>/)?.[1] ?? from;

/** Lo que se guarda en system_info (la contraseña va cifrada) */
interface StoredMailSettings {
  host?: string;
  port?: number;
  user?: string;
  passwordBox?: string;
  fromName?: string;
  fromEmail?: string;
  feedbackTo?: string;
}

export interface MailSettingsView {
  /** De dónde se está tomando la configuración ahora */
  source: 'panel' | 'env' | 'console';
  host: string;
  port: number;
  user: string;
  passwordSet: boolean;
  /** La contraseña guardada no se pudo descifrar (cambió la llave del servidor) */
  passwordUnreadable: boolean;
  fromName: string;
  fromEmail: string;
  feedbackTo: string;
}

export interface MailSettingsInput {
  host?: string;
  port?: number;
  user?: string;
  /** Vacío o ausente = conservar la actual */
  password?: string;
  fromName?: string;
  fromEmail?: string;
  feedbackTo?: string;
}

interface ResolvedSmtp {
  source: 'panel' | 'env';
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

/** Tope de transportes en memoria (uno por cuenta SMTP distinta) */
const MAX_TRANSPORTERS = 50;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  /** Transportes SMTP por configuración (ver transporterFor) */
  private readonly transporters = new Map<string, nodemailer.Transporter>();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  private get secret() {
    return (
      this.configService.get<string>('SETTINGS_ENCRYPTION_KEY') ||
      this.configService.getOrThrow<string>('JWT_SECRET')
    );
  }

  private async stored(): Promise<StoredMailSettings> {
    const row = await this.prisma.systemInfo.findUnique({
      where: { key: MAIL_SETTINGS_KEY },
    });
    try {
      return row ? (JSON.parse(row.content) as StoredMailSettings) : {};
    } catch {
      return {};
    }
  }

  private fromHeader(name?: string, email?: string) {
    if (!email) return null;
    return name ? `${name.replace(/[<>"]/g, '')} <${email}>` : email;
  }

  /** SMTP a usar: el del panel si está completo, si no el del .env, si no ninguno */
  private async resolve(): Promise<ResolvedSmtp | null> {
    const s = await this.stored();
    const pass = s.passwordBox
      ? decryptSecret(s.passwordBox, this.secret)
      : null;
    if (s.host && s.user && pass) {
      return {
        source: 'panel',
        host: s.host,
        port: s.port ?? 587,
        user: s.user,
        pass,
        // Sin nombre de remitente configurado: el nombre del herbario
        from: this.fromHeader(
          s.fromName || herbariumName(),
          s.fromEmail || s.user,
        )!,
      };
    }

    const env = (k: string) => this.configService.get<string>(k);
    if (env('MAIL_HOST') && env('MAIL_USER') && env('MAIL_PASSWORD')) {
      return {
        source: 'env',
        host: env('MAIL_HOST')!,
        port: parseInt(env('MAIL_PORT') || '587', 10),
        user: env('MAIL_USER')!,
        pass: env('MAIL_PASSWORD')!,
        // SMTP de la plataforma (.env): el remitente lleva el nombre del herbario que envía
        from: this.fromHeader(
          herbariumName(),
          emailOf(env('MAIL_FROM')) || env('MAIL_USER'),
        )!,
      };
    }
    return null;
  }

  /**
   * Un transporte por configuración SMTP (multitenant: cada herbario puede tener su cuenta).
   * Con uno solo compartido, dos herbarios enviando a la vez se lo reemplazaban mutuamente.
   */
  private transporterFor(smtp: ResolvedSmtp): nodemailer.Transporter {
    const fingerprint = [smtp.host, smtp.port, smtp.user, smtp.pass].join('|');
    let instance = this.transporters.get(fingerprint);
    if (!instance) {
      if (this.transporters.size >= MAX_TRANSPORTERS) this.resetTransporters();
      instance = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: { user: smtp.user, pass: smtp.pass },
      });
      this.transporters.set(fingerprint, instance);
    }
    return instance;
  }

  private resetTransporters() {
    for (const transporter of this.transporters.values()) transporter.close();
    this.transporters.clear();
  }

  /** Destinatario del buzón de sugerencias */
  /**
   * Quién recibe los mensajes de Contacto ("Escríbenos") del herbario en curso: el correo del
   * panel (Correo → Mensajes de contacto); si está vacío, la cuenta configurada para enviar;
   * si no, el correo de contacto registrado al crear el herbario en la plataforma.
   * Nunca un correo global (.env): con varios herbarios, los mensajes de uno llegarían a otro.
   */
  async feedbackRecipient(): Promise<string> {
    const s = await this.stored();
    const to =
      s.feedbackTo ||
      s.fromEmail ||
      s.user ||
      TenantContext.current()?.contactEmail;
    if (to) return to;
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new ServiceUnavailableException(
        'Este herbario todavía no configuró a qué correo llegan los mensajes. Intenta más tarde.',
      );
    }
    // Desarrollo: sin correo configurado, el mensaje solo se muestra en la consola
    return 'sin-configurar@herbario.local';
  }

  // ---------- Configuración (panel del admin) ----------

  async getSettings(): Promise<MailSettingsView> {
    const s = await this.stored();
    const resolved = await this.resolve();
    return {
      source: resolved?.source ?? 'console',
      host: s.host ?? '',
      port: s.port ?? 587,
      user: s.user ?? '',
      passwordSet: !!s.passwordBox,
      passwordUnreadable:
        !!s.passwordBox && decryptSecret(s.passwordBox, this.secret) === null,
      fromName: s.fromName ?? '',
      fromEmail: s.fromEmail ?? '',
      feedbackTo: s.feedbackTo ?? '',
    };
  }

  async updateSettings(input: MailSettingsInput): Promise<MailSettingsView> {
    const current = await this.stored();
    const trim = (v?: string) => (v === undefined ? undefined : v.trim());
    const next: StoredMailSettings = {
      ...current,
      ...(input.host !== undefined && { host: trim(input.host) }),
      ...(input.port !== undefined && { port: input.port }),
      ...(input.user !== undefined && { user: trim(input.user) }),
      ...(input.fromName !== undefined && { fromName: trim(input.fromName) }),
      ...(input.fromEmail !== undefined && {
        fromEmail: trim(input.fromEmail),
      }),
      ...(input.feedbackTo !== undefined && {
        feedbackTo: trim(input.feedbackTo),
      }),
      // Contraseña: vacía = conservar. Se quitan espacios (Gmail las muestra en grupos de 4)
      ...(input.password && {
        passwordBox: encryptSecret(
          input.password.replace(/\s+/g, ''),
          this.secret,
        ),
      }),
    };
    const content = JSON.stringify(next);
    await this.prisma.systemInfo.upsert({
      where: { key: MAIL_SETTINGS_KEY },
      update: { content },
      // Inactivo: es configuración, no una página pública del sitio
      create: {
        key: MAIL_SETTINGS_KEY,
        title: 'Correo (SMTP)',
        content,
        isActive: false,
      },
    });
    return this.getSettings();
  }

  /** Borra la configuración del panel (vuelve al .env o al modo consola) */
  async clearSettings(): Promise<MailSettingsView> {
    await this.prisma.systemInfo.deleteMany({
      where: { key: MAIL_SETTINGS_KEY },
    });
    return this.getSettings();
  }

  /** Prueba de conexión + correo de prueba al admin */
  async sendTest(to: string): Promise<{ message: string }> {
    const smtp = await this.resolve();
    if (!smtp) {
      throw new BadRequestException(
        'No hay un servidor de correo configurado: completa los datos y guarda primero',
      );
    }
    try {
      await this.transporterFor(smtp).verify();
    } catch (error) {
      throw new BadRequestException(
        `No se pudo conectar con ${smtp.host}:${smtp.port} (${(error as Error).message}). Revisa servidor, puerto, usuario y contraseña de aplicación.`,
      );
    }
    await this.sendMail({
      to,
      subject: `Correo de prueba - ${herbariumName()}`,
      html: `<h2>¡El correo funciona!</h2><p>Este mensaje confirma que el Herbario puede enviar correos (${smtp.source === 'panel' ? 'configuración del panel' : 'configuración del servidor'}).</p>`,
    });
    return { message: `Correo de prueba enviado a ${to}` };
  }

  // ---------- Envío ----------

  /**
   * Envía un correo. Lanza error si falla, para que quien llama decida qué hacer
   * (p. ej. no cambiar la contraseña si el correo no salió).
   */
  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
    /** A quién le llega la respuesta (p. ej. el visitante que escribió en Contacto) */
    replyTo?: string;
  }): Promise<void> {
    const smtp = await this.resolve();

    if (!smtp) {
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        // 503 con mensaje claro (antes un 500 genérico): el código no puede quedar solo en el log
        throw new ServiceUnavailableException(
          'El envío de correos no está configurado. Avisa al administrador del herbario (Panel → Correo).',
        );
      }
      const text = options.html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|h\d|li|div)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/\n\s*\n+/g, '\n')
        .trim();
      this.logger.log(
        `\n┌── 📧 Correo (modo desarrollo, no se envió) ──\n│ Para: ${options.to}\n${options.replyTo ? `│ Responder a: ${options.replyTo}\n` : ''}│ Asunto: ${options.subject}\n│\n${text
          .split('\n')
          .map((line) => `│ ${line.trim()}`)
          .join('\n')}\n└──────────────────────────────────────────────`,
      );
      return;
    }

    try {
      await this.transporterFor(smtp).sendMail({
        from: options.from || smtp.from,
        to: options.to,
        ...(options.replyTo && { replyTo: options.replyTo }),
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`Correo enviado a ${options.to}`);
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el correo a ${options.to}: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
