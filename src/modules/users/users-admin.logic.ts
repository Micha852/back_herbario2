/**
 * Reglas de la gestión de usuarios (funciones puras, fáciles de probar).
 */

import { randomInt } from 'crypto';
import { UserRole } from './enums/user-role.enum';

export interface AdminChange {
  actorId: string;
  targetId: string;
  /** Rol actual del usuario que se modifica */
  currentRole: string;
  /** Si está activo ahora */
  currentIsActive: boolean;
  /** Nuevo rol (undefined = no cambia) */
  newRole?: string;
  /** Nuevo estado (undefined = no cambia) */
  newIsActive?: boolean;
  /** Administradores activos en el sistema (incluido el usuario modificado si lo es) */
  activeAdmins: number;
}

/**
 * Devuelve el motivo por el que el cambio no se permite, o null si es válido.
 * - Un admin no puede quitarse su propio rol ni desactivarse.
 * - Nunca puede quedar el sistema sin administradores activos.
 */
export function adminChangeError(change: AdminChange): string | null {
  const losesAdmin =
    change.currentRole === UserRole.ADMIN &&
    change.currentIsActive &&
    ((change.newRole !== undefined && change.newRole !== UserRole.ADMIN) ||
      change.newIsActive === false);

  if (!losesAdmin) return null;

  if (change.actorId === change.targetId) {
    return 'No puedes quitarte el rol de administrador ni desactivar tu propia cuenta';
  }
  if (change.activeAdmins <= 1) {
    return 'Debe quedar al menos un administrador activo en el sistema';
  }
  return null;
}

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const ALL = UPPER + LOWER + DIGITS;

/**
 * Contraseña temporal segura y legible (sin 0/O, 1/l/I): 10 caracteres con
 * mayúscula, minúscula y número (cumple la política de contraseñas).
 */
export function generateTemporaryPassword(length = 10): string {
  const pick = (chars: string) => chars[randomInt(chars.length)];
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS)];
  while (chars.length < length) chars.push(pick(ALL));
  // Mezcla (Fisher-Yates)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
