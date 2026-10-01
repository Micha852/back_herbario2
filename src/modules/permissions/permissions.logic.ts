/**
 * Lógica pura de permisos (sin base de datos): fácil de probar con tests unitarios.
 */

import { UserRole } from '../users/enums/user-role.enum';
import {
  ALL_PERMISSIONS,
  CUSTOMIZABLE_ROLES,
  isPermission,
  Permission,
  PERMISSIONS,
  ROLE_DEFAULTS,
} from './permissions.constants';

export interface PermissionOverride {
  permission: string;
  granted: boolean;
}

function asRole(roleName: string | undefined | null): UserRole | null {
  return Object.values(UserRole).includes(roleName as UserRole) ? (roleName as UserRole) : null;
}

/** Permisos por defecto del rol (vacío si el rol no existe) */
export function roleDefaults(roleName: string | undefined | null): Permission[] {
  const role = asRole(roleName);
  return role ? [...ROLE_DEFAULTS[role]] : [];
}

/**
 * Permisos efectivos = permisos del rol ± ajustes del usuario.
 * - ADMIN: siempre todos (los ajustes se ignoran).
 * - Roles no personalizables (VISITANTE): solo sus defaults (los ajustes se ignoran).
 * - Ajustes con permisos desconocidos se ignoran.
 */
export function computeEffectivePermissions(
  roleName: string | undefined | null,
  overrides: PermissionOverride[] = [],
): Permission[] {
  const role = asRole(roleName);
  if (!role) return [];
  if (role === UserRole.ADMIN) return [...ALL_PERMISSIONS];

  const effective = new Set<Permission>(ROLE_DEFAULTS[role]);
  if (CUSTOMIZABLE_ROLES.includes(role)) {
    for (const { permission, granted } of overrides) {
      if (!isPermission(permission)) continue;
      if (granted) effective.add(permission);
      else effective.delete(permission);
    }
  }
  // Orden estable (el del catálogo)
  return ALL_PERMISSIONS.filter((permission) => effective.has(permission));
}

/**
 * Ajustes a guardar para que el usuario quede con exactamente `desired` permisos:
 * solo se guardan las diferencias con los defaults del rol.
 */
export function overridesFor(
  roleName: string | undefined | null,
  desired: Permission[],
): PermissionOverride[] {
  const defaults = new Set(roleDefaults(roleName));
  const wanted = new Set(desired);
  const result: PermissionOverride[] = [];
  for (const permission of ALL_PERMISSIONS) {
    const inDefaults = defaults.has(permission);
    const inWanted = wanted.has(permission);
    if (inWanted && !inDefaults) result.push({ permission, granted: true });
    if (!inWanted && inDefaults) result.push({ permission, granted: false });
  }
  return result;
}

/**
 * ¿Puede editar esta muestra? edit_any → cualquiera; edit_own → solo las que registró.
 * Las muestras sin autor (anteriores al registro de createdBy) solo con edit_any.
 */
export function canEditSpecimen(
  permissions: readonly string[],
  userId: string,
  specimenCreatedById: string | null | undefined,
): boolean {
  if (permissions.includes(PERMISSIONS.SPECIMENS_EDIT_ANY)) return true;
  return (
    permissions.includes(PERMISSIONS.SPECIMENS_EDIT_OWN) &&
    !!specimenCreatedById &&
    specimenCreatedById === userId
  );
}

export function hasPermission(permissions: readonly string[] | undefined, permission: Permission): boolean {
  return !!permissions?.includes(permission);
}
