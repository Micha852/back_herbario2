import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Envío de correos por SMTP (MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD, MAIL_FROM).
 *
 * Modo desarrollo: si no hay credenciales SMTP y NODE_ENV no es 'production',
 * el correo NO se envía: se escribe en la consola del back para poder probar
 * (p. ej. ver la contraseña temporal de "recuperar contraseña").
 * En producción las credenciales son obligatorias (src/config/env.validation.ts).
 *
 * Importante: escapar con escapeHtml() todo dato del usuario que vaya en el HTML.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(private configService: ConfigService) {
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASSWORD');
    const host = this.configService.get<string>('MAIL_HOST');
    this.from = this.configService.get<string>('MAIL_FROM') || 'Herbario HUAZ <noreply@uniamazonia.edu.co>';

    if (host && user && pass) {
      const port = parseInt(this.configService.get<string>('MAIL_PORT') || '587', 10);
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      this.transporter = null;
      this.logger.warn('SMTP sin configurar: los correos se mostrarán en consola (modo desarrollo)');
    }
  }

  /**
   * Envía un correo. Lanza error si falla, para que quien llama decida qué hacer
   * (p. ej. no cambiar la contraseña si el correo no salió).
   */
  async sendMail(options: { to: string; subject: string; html: string; from?: string }): Promise<void> {
    if (!this.transporter) {
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        throw new Error('SMTP no configurado');
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
        `\n┌── 📧 Correo (modo desarrollo, no se envió) ──\n│ Para: ${options.to}\n│ Asunto: ${options.subject}\n│\n${text
          .split('\n')
          .map((line) => `│ ${line.trim()}`)
          .join('\n')}\n└──────────────────────────────────────────────`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: options.from || this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`Email sent to ${options.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}: ${error.message}`);
      throw error;
    }
  }
}
