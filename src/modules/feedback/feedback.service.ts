import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
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
        <p><strong>Usuario:</strong> ${userName}</p>
        <p><strong>Correo:</strong> ${userEmail}</p>
        <hr>
        <h3>Comentario:</h3>
        <p>${dto.comment}</p>
        <hr>
        <p><small>Enviado desde el Herbario Digital - Universidad de la Amazonia</small></p>
      `,
    });

    return { message: 'Sugerencia enviada correctamente. Gracias por tu comentario.' };
  }
}
