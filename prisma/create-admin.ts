/**
 * Crea el primer administrador de una instalación nueva (producción o Docker).
 * A diferencia de seed.ts no borra nada ni crea usuarios de prueba.
 *
 *   npm run create-admin                                   # pregunta todo
 *   npm run create-admin -- --email a@b.co --name "Nombre"  # pregunta solo la contraseña
 *   docker compose exec back npm run create-admin
 *
 * Sin terminal (scripts/CI): la contraseña se toma de ADMIN_PASSWORD.
 * La contraseña nunca se pasa como argumento (quedaría en el historial de la consola).
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';

const ADMIN_ROLE = 'ADMINISTRADOR'; // UserRole.ADMIN
// Mismas reglas que el registro (CreateUserDto)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1]?.trim() : undefined;
}

/** Pregunta en la consola; con hidden no muestra lo que se escribe */
function ask(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  const out = rl as unknown as { _writeToOutput: (s: string) => void };
  if (hidden) {
    out._writeToOutput = (s: string) => {
      if (s.startsWith(question)) process.stdout.write(question);
    };
  }
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    }),
  );
}

function fail(message: string): never {
  throw new Error(message);
}

async function main() {
  const interactive = process.stdin.isTTY;

  const email = (
    arg('email') ?? (interactive ? await ask('Correo: ') : '')
  ).toLowerCase();
  if (!EMAIL.test(email))
    fail('Correo inválido (usa --email correo@dominio.co)');

  const name =
    arg('name') ?? (interactive ? await ask('Nombre completo: ') : '');
  if (name.length < 3)
    fail('El nombre debe tener al menos 3 caracteres (usa --name)');

  let password = process.env.ADMIN_PASSWORD ?? '';
  if (!password) {
    if (!interactive)
      fail('Sin terminal: define la contraseña en ADMIN_PASSWORD');
    password = await ask('Contraseña: ', true);
    if (
      STRONG_PASSWORD.test(password) &&
      (await ask('Repite la contraseña: ', true)) !== password
    )
      fail('Las contraseñas no coinciden');
  }
  if (!STRONG_PASSWORD.test(password))
    fail(
      'La contraseña necesita 8+ caracteres, una mayúscula, una minúscula y un número',
    );

  const role = await prisma.role.findUnique({ where: { name: ADMIN_ROLE } });
  if (!role)
    fail(
      `No existe el rol ${ADMIN_ROLE}: aplica antes las migraciones (npx prisma migrate deploy)`,
    );

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing)
    fail(
      `Ya existe una cuenta con ${email}. Para darle acceso de administrador usa el panel (Usuarios).`,
    );

  await prisma.user.create({
    data: {
      email,
      name,
      password: await bcrypt.hash(password, 10),
      roleId: role.id,
      isActive: true,
      authProvider: 'LOCAL',
    },
  });

  const admins = await prisma.user.count({
    where: { roleId: role.id, isActive: true },
  });
  console.log(`\n✅ Administrador creado: ${name} <${email}>`);
  console.log(
    `   Administradores activos: ${admins}. Ya puedes iniciar sesión en el panel.`,
  );
}

main()
  .catch((error: Error) => {
    console.error(`\n⛔ ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
