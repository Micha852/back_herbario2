/**
 * Códigos de verificación de correo (6 dígitos, un solo uso).
 * Se guarda solo el hash del código; vence a los 15 minutos y admite 5 intentos.
 * Reutilizable: cada flujo usa su propio `purpose`. Sin `userId` (p. ej. el registro, cuando
 * la cuenta aún no existe) el código se identifica por el correo.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { escapeHtml } from '../../common/utils/html.util';

export const CODE_TTL_MINUTES = 15;
export const MAX_ATTEMPTS = 5;

const hashCode = (code: string) =>
  createHash('sha256').update(code).digest('hex');

@Injectable()
export class EmailVerificationService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  /** Códigos del flujo: por usuario, o por correo si aún no hay cuenta */
  private scope(params: {
    userId?: string | null;
    email: string;
    purpose: string;
  }) {
    return params.userId
      ? { userId: params.userId, purpose: params.purpose }
      : { userId: null, email: params.email, purpose: params.purpose };
  }

  /** Genera un código nuevo (anula los anteriores del mismo flujo) y lo envía por correo */
  async send(params: {
    userId?: string | null;
    email: string;
    purpose: string;
    name: string;
    action: string;
  }) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.$transaction([
      this.prisma.emailVerification.deleteMany({
        where: this.scope(params),
      }),
      this.prisma.emailVerification.create({
        data: {
          userId: params.userId ?? null,
          email: params.email,
          purpose: params.purpose,
          codeHash: hashCode(code),
          expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
        },
      }),
    ]);

    await this.mail.sendMail({
      to: params.email,
      subject: `Tu código de verificación: ${code} - Herbario HUAZ`,
      html: `
        <h2>Verifica tu correo</h2>
        <p>Hola ${escapeHtml(params.name)},</p>
        <p>Usa este código para ${escapeHtml(params.action)}:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px">${code}</p>
        <p>Vence en ${CODE_TTL_MINUTES} minutos. Si no lo solicitaste, ignora este correo.</p>
        <br><p>Herbario Digital - Universidad de la Amazonia</p>
      `,
    });
  }

  /** Valida el código; si es correcto lo consume. Lanza 400 con un mensaje claro si no */
  async verify(params: {
    userId?: string | null;
    email: string;
    purpose: string;
    code: string;
  }): Promise<void> {
    const record = await this.prisma.emailVerification.findFirst({
      where: this.scope(params),
      orderBy: { createdAt: 'desc' },
    });

    if (!record || record.email !== params.email) {
      throw new BadRequestException(
        'Primero solicita un código para este correo',
      );
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('El código venció. Solicita uno nuevo');
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Demasiados intentos. Solicita un código nuevo',
      );
    }
    if (record.codeHash !== hashCode(params.code.trim())) {
      await this.prisma.emailVerification.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      const left = MAX_ATTEMPTS - record.attempts - 1;
      throw new BadRequestException(
        left > 0
          ? `Código incorrecto. Te quedan ${left} intento(s)`
          : 'Código incorrecto. Solicita un código nuevo',
      );
    }

    await this.prisma.emailVerification.deleteMany({
      where: this.scope(params),
    });
  }
}
