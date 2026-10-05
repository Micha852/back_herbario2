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
const DEFAULT_FROM = 'Herbario HUAZ <noreply@uniamazonia.edu.co>';
const DEFAULT_FEEDBACK_TO = 'herbario@uniamazonia.edu.co';

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

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: {
    fingerprint: string;
    instance: nodemailer.Transporter;
  } | null = null;

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
        from:
          this.fromHeader(s.fromName, s.fromEmail || s.user) ?? DEFAULT_FROM,
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
        from: env('MAIL_FROM') || DEFAULT_FROM,
      };
    }
    return null;
  }

  private transporterFor(smtp: ResolvedSmtp): nodemailer.Transporter {
    const fingerprint = [smtp.host, smtp.port, smtp.user, smtp.pass].join('|');
    if (this.transporter?.fingerprint !== fingerprint) {
      this.transporter = {
        fingerprint,
        instance: nodemailer.createTransport({
          host: smtp.host,
          port: smtp.port,
          secure: smtp.port === 465,
          auth: { user: smtp.user, pass: smtp.pass },
        }),
      };
    }
    return this.transporter.instance;
  }

  /** Destinatario del buzón de sugerencias */
  /**
   * Quién recibe los mensajes de Contacto ("Escríbenos"): el correo del panel (Correo →
   * Mensajes de contacto); si está vacío, la misma cuenta configurada para enviar; si no
   * hay panel, HERBARIO_EMAIL / MAIL_USER del .env.
   */
  async feedbackRecipient(): Promise<string> {
    const s = await this.stored();
    return (
      s.feedbackTo ||
      s.fromEmail ||
      s.user ||
      this.configService.get<string>('HERBARIO_EMAIL') ||
      this.configService.get<string>('MAIL_USER') ||
      DEFAULT_FEEDBACK_TO
    );
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
    this.transporter = null;
    return this.getSettings();
  }

  /** Borra la configuración del panel (vuelve al .env o al modo consola) */
  async clearSettings(): Promise<MailSettingsView> {
    await this.prisma.systemInfo.deleteMany({
      where: { key: MAIL_SETTINGS_KEY },
    });
    this.transporter = null;
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
      subject: 'Correo de prueba - Herbario HUAZ',
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
