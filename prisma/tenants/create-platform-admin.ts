/**
 * Crea un administrador de la PLATAFORMA (base master): entra al panel /plataforma para crear
 * y suspender herbarios. No es usuario de ningún herbario.
 *
 *   npm run platform:create-admin -- --email yo@correo.co --name "Nombre"
 *   (pide la contraseña; sin terminal: PLATFORM_ADMIN_PASSWORD)
 */

import * as bcrypt from 'bcrypt';
import * as readline from 'readline';
import { arg, fail, master, run } from './lib';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

function askHidden(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  const out = rl as unknown as { _writeToOutput: (s: string) => void };
  out._writeToOutput = (s: string) => {
    if (s.startsWith(question)) process.stdout.write(question);
  };
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer.trim());
    }),
  );
}

run(async () => {
  const email = (arg('email') ?? '').trim().toLowerCase();
  const name = arg('name') ?? '';
  if (!EMAIL.test(email)) fail('Correo inválido (--email)');
  if (name.length < 3) fail('Falta el nombre (--name)');

  let password = process.env.PLATFORM_ADMIN_PASSWORD ?? '';
  if (!password) {
    if (!process.stdin.isTTY)
      fail('Sin terminal: define la contraseña en PLATFORM_ADMIN_PASSWORD');
    password = await askHidden('Contraseña: ');
    if ((await askHidden('Repite la contraseña: ')) !== password)
      fail('Las contraseñas no coinciden');
  }
  // Más exigente que la de un usuario: esta cuenta controla todos los herbarios
  if (!STRONG_PASSWORD.test(password))
    fail(
      'La contraseña necesita 10+ caracteres, mayúscula, minúscula y número',
    );

  const db = master();
  try {
    if (await db.platformAdmin.findUnique({ where: { email } }))
      fail(`Ya existe un administrador de plataforma con ${email}`);
    await db.platformAdmin.create({
      data: { email, name, password: await bcrypt.hash(password, 10) },
    });
    console.log(`\n✅ Administrador de plataforma creado: ${name} <${email}>`);
  } finally {
    await db.$disconnect();
  }
});
