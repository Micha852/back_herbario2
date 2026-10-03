/**
 * Validación de variables de entorno al arrancar (ConfigModule.forRoot({ validate })).
 * Si falta algo obligatorio, la app no arranca y dice qué falta.
 * Referencia de todas las variables: .env.example
 */

const REQUIRED = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;

/** Valores que delatan un secreto de ejemplo */
const PLACEHOLDER = /change|your|example|secret-key|refresh-secret/i;

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const errors: string[] = [];
  const isProduction = config.NODE_ENV === 'production';

  for (const key of REQUIRED) {
    const value = config[key];
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`Falta ${key}`);
    }
  }

  const jwtSecret = String(config.JWT_SECRET ?? '');
  const refreshSecret = String(config.JWT_REFRESH_SECRET ?? '');

  if (jwtSecret && refreshSecret && jwtSecret === refreshSecret) {
    errors.push('JWT_SECRET y JWT_REFRESH_SECRET deben ser distintos');
  }

  if (isProduction) {
    for (const [key, value] of [
      ['JWT_SECRET', jwtSecret],
      ['JWT_REFRESH_SECRET', refreshSecret],
    ]) {
      if (value.length < 32)
        errors.push(`${key} debe tener al menos 32 caracteres en producción`);
      if (PLACEHOLDER.test(value))
        errors.push(`${key} parece un valor de ejemplo: genera uno aleatorio`);
    }
    // El correo (SMTP) ya no es obligatorio aquí: se puede configurar en el panel (Correo)
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuración inválida (.env):\n  - ${errors.join('\n  - ')}\n` +
        "Revisa .env.example. Para generar un secreto: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"",
    );
  }

  return config;
}
