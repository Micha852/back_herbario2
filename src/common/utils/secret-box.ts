/**
 * Cifrado simétrico para secretos guardados en la base (p. ej. la contraseña SMTP).
 * AES-256-GCM; la llave sale de SETTINGS_ENCRYPTION_KEY o, si no existe, de JWT_SECRET.
 * Si se cambia esa llave, los secretos guardados dejan de poder leerse (hay que
 * volver a escribirlos en el panel).
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

const key = (secret: string) =>
  createHash('sha256').update(`settings:${secret}`).digest();

/** "iv.tag.cifrado" en base64url */
export function encryptSecret(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(secret), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data]
    .map((b) => b.toString('base64url'))
    .join('.');
}

/** Devuelve null si no se puede descifrar (llave distinta o dato alterado) */
export function decryptSecret(box: string, secret: string): string | null {
  try {
    const [iv, tag, data] = box
      .split('.')
      .map((part) => Buffer.from(part, 'base64url'));
    const decipher = createDecipheriv('aes-256-gcm', key(secret), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      'utf8',
    );
  } catch {
    return null;
  }
}
