import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '../users/enums/user-role.enum';
import {
  CUSTOMIZABLE_ROLES,
  isPermission,
  Permission,
  PERMISSION_DEFINITIONS,
  ROLE_DEFAULTS,
} from './permissions.constants';
import { canEditSpecimen, computeEffectivePermissions, overridesFor, roleDefaults } from './permissions.logic';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  /** Catálogo para la vista de gestión: permisos con textos + defaults por rol */
  getCatalog() {
    return {
      permissions: PERMISSION_DEFINITIONS,
      roleDefaults: ROLE_DEFAULTS,
      customizableRoles: CUSTOMIZABLE_ROLES,
    };
  }

  /** Permisos efectivos de un usuario (se calcula en cada petición autenticada) */
  async getEffectivePermissions(userId: string, roleName: string | undefined): Promise<Permission[]> {
    if (!CUSTOMIZABLE_ROLES.includes(roleName as UserRole)) {
      return computeEffectivePermissions(roleName);
    }
    const overrides = await this.prisma.userPermission.findMany({
      where: { userId },
      select: { permission: true, granted: true },
    });
    return computeEffectivePermissions(roleName, overrides);
  }

  /** Detalle para la vista de gestión de un usuario */
  async getUserPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: { select: { name: true } } },
    });
    if (!user) throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);

    const overrides = await this.prisma.userPermission.findMany({
      where: { userId },
      select: { permission: true, granted: true, updatedAt: true, grantedBy: { select: { id: true, name: true } } },
    });

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role.name },
      customizable: CUSTOMIZABLE_ROLES.includes(user.role.name as UserRole),
      defaults: roleDefaults(user.role.name),
      overrides,
      effective: computeEffectivePermissions(user.role.name, overrides),
    };
  }

  /**
   * Deja al usuario con exactamente `permissions`.
   * Solo se guardan las diferencias con los defaults de su rol.
   */
  async setUserPermissions(userId: string, permissions: string[], grantedById: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: { select: { name: true } } },
    });
    if (!user) throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    if (!CUSTOMIZABLE_ROLES.includes(user.role.name as UserRole)) {
      throw new BadRequestException(
        'Solo se pueden personalizar los permisos de los colaboradores (el administrador los tiene todos y los visitantes ninguno)',
      );
    }

    const unknown = permissions.filter((permission) => !isPermission(permission));
    if (unknown.length) {
      throw new BadRequestException(`Permisos desconocidos: ${unknown.join(', ')}`);
    }

    const overrides = overridesFor(user.role.name, permissions as Permission[]);
    await this.prisma.$transaction([
      this.prisma.userPermission.deleteMany({ where: { userId } }),
      ...(overrides.length
        ? [
            this.prisma.userPermission.createMany({
              data: overrides.map((override) => ({ ...override, userId, grantedById })),
            }),
          ]
        : []),
    ]);

    return this.getUserPermissions(userId);
  }

  /**
   * Verifica que el usuario pueda editar la muestra (edit_any, o edit_own si la registró él).
   * Lanza 404 si no existe y 403 si no tiene permiso.
   */
  async assertCanEditSpecimen(user: { id: string; permissions?: string[] }, specimenId: string): Promise<void> {
    const specimen = await this.prisma.specimen.findUnique({
      where: { id: specimenId },
      select: { createdById: true },
    });
    if (!specimen) throw new NotFoundException(`Specimen with ID ${specimenId} not found`);
    if (!canEditSpecimen(user.permissions ?? [], user.id, specimen.createdById)) {
      throw new ForbiddenException('Solo puedes editar las muestras que registraste');
    }
  }

  /** Vuelve a los permisos por defecto del rol */
  async resetUserPermissions(userId: string) {
    await this.prisma.userPermission.deleteMany({ where: { userId } });
    return this.getUserPermissions(userId);
  }
}
