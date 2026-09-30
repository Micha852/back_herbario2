import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { escapeHtml } from '../../common/utils/html.util';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  async sendFeedback(
    dto: CreateFeedbackDto,
    userName: string,
    userEmail: string,
  ): Promise<{ message: string }> {
    const herbarioEmail =
      this.configService.get<string>('HERBARIO_EMAIL') ||
      'herbario@uniamazonia.edu.co';

    await this.mailService.sendMail({
      to: herbarioEmail,
      subject: `Sugerencia de Usuario - Herbario HDUA`,
      html: `
        <h2>Nueva Sugerencia Recibida</h2>
        <p><strong>Usuario:</strong> ${escapeHtml(userName)}</p>
        <p><strong>Correo:</strong> ${escapeHtml(userEmail)}</p>
        <hr>
        <h3>Comentario:</h3>
        <p style="white-space: pre-line">${escapeHtml(dto.comment)}</p>
        <hr>
        <p><small>Enviado desde el Herbario Digital - Universidad de la Amazonia</small></p>
      `,
    });

    return { message: 'Sugerencia enviada correctamente. Gracias por tu comentario.' };
  }
}
