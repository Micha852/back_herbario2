import { BadRequestException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { MailService } from '../mail/mail.service';

const setup = () => {
  const mail = {
    feedbackRecipient: jest.fn().mockResolvedValue('herbario@correo.co'),
    sendMail: jest.fn().mockResolvedValue(undefined),
  };
  return { mail, service: new FeedbackService(mail as unknown as MailService) };
};

describe('Escríbenos (contacto)', () => {
  it('un visitante sin cuenta debe dar nombre y correo', async () => {
    const { service, mail } = setup();
    await expect(
      service.sendFeedback({
        comment: 'Hola, una pregunta sobre la colección',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mail.sendMail).not.toHaveBeenCalled();
  });

  it('llega al correo del panel y se responde directo a quien escribió', async () => {
    const { service, mail } = setup();
    await service.sendFeedback({
      comment: 'Hola, una pregunta sobre la colección',
      name: 'Ana <script>',
      email: 'ana@correo.co',
    });
    const sent = mail.sendMail.mock.calls[0][0];
    expect(sent).toMatchObject({
      to: 'herbario@correo.co',
      replyTo: 'ana@correo.co',
    });
    expect(sent.html).toContain('visitante sin cuenta');
    expect(sent.html).not.toContain('<script>');
  });

  it('con sesión usa los datos de la cuenta', async () => {
    const { service, mail } = setup();
    await service.sendFeedback(
      { comment: 'Sugerencia para la ficha técnica' },
      { name: 'María', email: 'maria@correo.co' },
    );
    expect(mail.sendMail.mock.calls[0][0]).toMatchObject({
      replyTo: 'maria@correo.co',
    });
    expect(mail.sendMail.mock.calls[0][0].html).toContain('usuario registrado');
  });

  it('el campo trampa lleno (bot) responde igual pero no envía nada', async () => {
    const { service, mail } = setup();
    const res = await service.sendFeedback({
      comment: 'Compra seguidores baratos aquí ya',
      name: 'Bot',
      email: 'bot@spam.co',
      website: 'http://spam.co',
    });
    expect(res.message).toBeTruthy();
    expect(mail.sendMail).not.toHaveBeenCalled();
  });
});
