import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  assertEmailFree,
  normalizeEmail,
  withEmailConflict,
} from './email.util';

/** Base falsa con una sola cuenta: ana@correo.co (id u1) */
const prisma = {
  user: {
    findUnique: jest.fn(({ where }: { where: { email: string } }) =>
      Promise.resolve(where.email === 'ana@correo.co' ? { id: 'u1' } : null),
    ),
  },
} as unknown as Parameters<typeof assertEmailFree>[0];

describe('correos de las cuentas', () => {
  it('normaliza: minúsculas y sin espacios', () => {
    expect(normalizeEmail('  Ana@Correo.CO ')).toBe('ana@correo.co');
  });

  it('un correo ya registrado no se puede usar, sin importar mayúsculas', async () => {
    await expect(
      assertEmailFree(prisma, 'ANA@correo.co'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('al editar, la propia cuenta puede conservar su correo', async () => {
    await expect(
      assertEmailFree(prisma, 'ana@correo.co', 'u1'),
    ).resolves.toBeUndefined();
    await expect(
      assertEmailFree(prisma, 'ana@correo.co', 'u2'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('un correo libre pasa', async () => {
    await expect(
      assertEmailFree(prisma, 'nuevo@correo.co'),
    ).resolves.toBeUndefined();
  });

  it('no permite el dominio interno de Chairá', async () => {
    await expect(
      assertEmailFree(prisma, 'visitante.chaira.3@chaira.local'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('dos registros simultáneos: el choque con el índice único es 409, no 500', async () => {
    const unique = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: 'x',
      meta: { target: ['email'] },
    });
    await expect(
      withEmailConflict(Promise.reject(unique)),
    ).rejects.toBeInstanceOf(ConflictException);
    // Otros errores no se disfrazan
    const other = new Error('otro');
    await expect(withEmailConflict(Promise.reject(other))).rejects.toBe(other);
    await expect(withEmailConflict(Promise.resolve(5))).resolves.toBe(5);
  });
});
