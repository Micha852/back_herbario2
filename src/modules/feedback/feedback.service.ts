import { Injectable } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { escapeHtml } from '../../common/utils/html.util';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    private mailService: MailService,
  ) {}

  async sendFeedback(
    dto: CreateFeedbackDto,
    userName: string,
    userEmail: string,
  ): Promise<{ message: string }> {
    // Configurable en el panel (Correo); si no, HERBARIO_EMAIL del .env
    const herbarioEmail = await this.mailService.feedbackRecipient();

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

    return {
      message: 'Sugerencia enviada correctamente. Gracias por tu comentario.',
    };
  }
}
