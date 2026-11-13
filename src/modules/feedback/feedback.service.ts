import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { escapeHtml } from '../../common/utils/html.util';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { herbariumName } from '../../tenancy/tenant-context';

const SENT = {
  message: 'Mensaje enviado. Te responderemos a tu correo si hace falta.',
};

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private mailService: MailService) {}

  /**
   * "Escríbenos": el mensaje llega por correo al herbario, con "Responder a" = quien escribe.
   * account: la cuenta con sesión (si no hay, se usan name y email del formulario).
   */
  async sendFeedback(
    dto: CreateFeedbackDto,
    account?: { name: string; email: string },
  ): Promise<{ message: string }> {
    // Campo trampa lleno = bot: se responde igual (no darle pistas) pero no se envía nada
    if (dto.website?.trim()) {
      this.logger.warn('Mensaje de contacto descartado (campo trampa lleno)');
      return SENT;
    }

    const sender = account ?? this.guest(dto);
    // Del herbario en curso: panel (Correo) o su correo de contacto en la plataforma
    const herbarioEmail = await this.mailService.feedbackRecipient();

    await this.mailService.sendMail({
      to: herbarioEmail,
      replyTo: sender.email,
      subject: `Mensaje de ${sender.name} - ${herbariumName()}`,
      html: `
        <h2>Nuevo mensaje desde "Escríbenos"</h2>
        <p><strong>De:</strong> ${escapeHtml(sender.name)} &lt;${escapeHtml(sender.email)}&gt;
          (${account ? 'usuario registrado' : 'visitante sin cuenta'})</p>
        <hr>
        <p style="white-space: pre-line">${escapeHtml(dto.comment)}</p>
        <hr>
        <p><small>Para contestar, responde a este correo: le llega a ${escapeHtml(sender.email)}.<br>
        Enviado desde el herbario digital de ${escapeHtml(herbariumName())}</small></p>
      `,
    });

    return SENT;
  }

  private guest(dto: CreateFeedbackDto) {
    if (!dto.name || !dto.email) {
      throw new BadRequestException(
        'Escribe tu nombre y tu correo para poder responderte',
      );
    }
    return { name: dto.name, email: dto.email };
  }
}
