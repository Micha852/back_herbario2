/**
 * Correos de las cuentas: una sola regla para registro, perfil, panel de usuarios y Chairá.
 * - Siempre en minúsculas y sin espacios: "Ana@Correo.co" y "ana@correo.co" son la misma
 *   cuenta (la base lo exige con un CHECK, migración 20261004200000_users_email_lowercase).
 * - Un correo no puede estar ya en la base (en ninguna cuenta, activa o no).
 */

import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Transform } from 'class-transformer';
import { CHAIRA_EMAIL_DOMAIN } from '../../modules/auth/chaira/chaira.constants';

export const EMAIL_TAKEN = 'El correo ya está registrado';

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Para los DTO: normaliza el correo antes de validarlo */
export const NormalizeEmail = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  );

/**
 * Lanza 409 si el correo ya lo usa otra cuenta (exceptUserId: la propia, al editar).
 * Rechaza el dominio interno de Chairá: con él el sistema reconoce las cuentas de Chairá.
 */
export async function assertEmailFree(
  prisma: { user: { findUnique: Prisma.UserDelegate['findUnique'] } },
  email: string,
  exceptUserId?: string,
): Promise<void> {
  const normalized = normalizeEmail(email);
  if (normalized.endsWith(`@${CHAIRA_EMAIL_DOMAIN}`)) {
    throw new BadRequestException('Usa un correo real');
  }
  const existing = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true },
  });
  if (existing && existing.id !== exceptUserId) {
    throw new ConflictException(EMAIL_TAKEN);
  }
}

/**
 * Dos solicitudes simultáneas con el mismo correo pasan la revisión previa; la segunda
 * choca con el índice único de la base. Se responde 409 (no 500).
 */
export async function withEmailConflict<T>(operation: Promise<T>): Promise<T> {
  try {
    return await operation;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      String(error.meta?.target ?? '').includes('email')
    ) {
      throw new ConflictException(EMAIL_TAKEN);
    }
    throw error;
  }
}
