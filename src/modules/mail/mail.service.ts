import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST') || 'smtp.gmail.com',
      port: parseInt(this.configService.get<string>('MAIL_PORT') || '587'),
      secure: false,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  /**
   * Generic send mail method
   */
  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: options.from || this.configService.get<string>('MAIL_FROM') || 'noreply@hdua.com',
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

  async sendPasswordRecovery(email: string, token: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM') || 'noreply@hdua.com',
        to: email,
        subject: 'HDUA - Recuperación de Contraseña',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2E7D32;">Herbario Digital Universidad Amazonia</h2>
            <p>Has solicitado recuperar tu contraseña.</p>
            <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
            <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
              Restablecer Contraseña
            </a>
            <p style="margin-top: 20px; color: #666;">
              Este enlace expirará en 1 hora.<br>
              Si no solicitaste este cambio, ignora este correo.
            </p>
          </div>
        `,
      });

      this.logger.log(`Password recovery email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}: ${error.message}`);
      throw error;
    }
  }

  async sendWelcome(email: string, name: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM') || 'noreply@hdua.com',
        to: email,
        subject: 'Bienvenido a HDUA - Herbario Digital',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2E7D32;">¡Bienvenido al Herbario Digital!</h2>
            <p>Hola <strong>${name}</strong>,</p>
            <p>Tu cuenta ha sido creada exitosamente en el Herbario Digital de la Universidad de la Amazonia.</p>
            <p>Ahora puedes:</p>
            <ul>
              <li>Explorar nuestra colección de especímenes botánicos</li>
              <li>Contribuir con comentarios y observaciones</li>
              <li>Participar en proyectos de investigación</li>
            </ul>
            <p style="margin-top: 20px;">
              <strong>Universidad de la Amazonia</strong><br>
              Florencia, Caquetá - Colombia
            </p>
          </div>
        `,
      });

      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email: ${error.message}`);
    }
  }
}
