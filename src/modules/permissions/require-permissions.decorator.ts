import { SetMetadata } from '@nestjs/common';
import { Permission } from './permissions.constants';

export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Exige AL MENOS UNO de los permisos indicados (usar junto a JwtAuthGuard y PermissionsGuard).
 * Ej: @RequirePermissions(PERMISSIONS.SPECIMENS_EDIT_ANY, PERMISSIONS.SPECIMENS_EDIT_OWN)
 * Las reglas finas (p. ej. "solo sus propias muestras") se validan en el servicio.
 */
export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
