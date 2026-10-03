import { createHash } from 'crypto';

/** Dominio ficticio para las cuentas de Chairá (no reciben correos) */
export const CHAIRA_EMAIL_DOMAIN = 'chaira.local';

/** Llave del navegador: 32-128 caracteres base64url */
export const DEVICE_KEY_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

export const hashDeviceKey = (key: string) =>
  createHash('sha256').update(key).digest('hex');
