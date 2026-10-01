/**
 * Catálogo de permisos del sistema.
 *
 * - ADMINISTRADOR: tiene TODOS los permisos siempre (no se pueden recortar).
 * - COLABORADOR: arranca con ROLE_DEFAULTS y el admin puede conceder/quitar
 *   permisos a cada colaborador (tabla user_permissions).
 * - VISITANTE: sin permisos de gestión (consulta, comenta y gestiona su perfil
 *   por estar autenticado, no por permisos). No se le pueden conceder.
 *
 * Gestionar usuarios y permisos NO está en el catálogo: es exclusivo del ADMIN
 * y nunca se delega (si no, un colaborador podría darse permisos a sí mismo).
 */

import { UserRole } from '../users/enums/user-role.enum';

export const PERMISSIONS = {
  SPECIMENS_CREATE: 'specimens.create',
  SPECIMENS_EDIT_OWN: 'specimens.edit_own',
  SPECIMENS_EDIT_ANY: 'specimens.edit_any',
  SPECIMENS_STATUS: 'specimens.status',
  SPECIMENS_DELETE: 'specimens.delete',
  CATALOGS_MANAGE: 'catalogs.manage',
  CATALOGS_DELETE: 'catalogs.delete',
  REPORTS_GENERATE: 'reports.generate',
  CMS_EDIT: 'cms.edit',
  COMMENTS_MODERATE: 'comments.moderate',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

export interface PermissionDefinition {
  key: Permission;
  group: string;
  label: string;
  description: string;
}

/** Textos para la vista de gestión de permisos (en español) */
export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    key: PERMISSIONS.SPECIMENS_CREATE,
    group: 'Muestras',
    label: 'Registrar muestras',
    description: 'Crear muestras nuevas con sus imágenes.',
  },
  {
    key: PERMISSIONS.SPECIMENS_EDIT_OWN,
    group: 'Muestras',
    label: 'Editar sus propias muestras',
    description: 'Editar datos, recolectores e imágenes de las muestras que el usuario registró.',
  },
  {
    key: PERMISSIONS.SPECIMENS_EDIT_ANY,
    group: 'Muestras',
    label: 'Editar cualquier muestra',
    description: 'Editar datos, recolectores e imágenes de todas las muestras.',
  },
  {
    key: PERMISSIONS.SPECIMENS_STATUS,
    group: 'Muestras',
    label: 'Activar / inactivar muestras',
    description: 'Ocultar o publicar muestras y ver las inactivas en la galería y el panel.',
  },
  {
    key: PERMISSIONS.SPECIMENS_DELETE,
    group: 'Muestras',
    label: 'Eliminar muestras',
    description: 'Borrar muestras de forma permanente (con sus imágenes y comentarios).',
  },
  {
    key: PERMISSIONS.CATALOGS_MANAGE,
    group: 'Catálogos',
    label: 'Gestionar catálogos',
    description: 'Crear y editar taxonomía, ubicaciones, proyectos y demás parámetros.',
  },
  {
    key: PERMISSIONS.CATALOGS_DELETE,
    group: 'Catálogos',
    label: 'Inhabilitar / eliminar en catálogos',
    description: 'Inhabilitar elementos de los catálogos o eliminarlos si no están en uso.',
  },
  {
    key: PERMISSIONS.REPORTS_GENERATE,
    group: 'Informes',
    label: 'Generar informes',
    description: 'Generar y descargar informes (por recolector, Darwin Core...).',
  },
  {
    key: PERMISSIONS.CMS_EDIT,
    group: 'Contenido',
    label: 'Editar páginas institucionales',
    description: 'Editar Historia, Datos, Contacto y Términos.',
  },
  {
    key: PERMISSIONS.COMMENTS_MODERATE,
    group: 'Comentarios',
    label: 'Moderar comentarios',
    description: 'Eliminar comentarios de otros usuarios.',
  },
];

/** Permisos por defecto de cada rol (el admin puede ajustarlos por colaborador) */
export const ROLE_DEFAULTS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: ALL_PERMISSIONS,
  [UserRole.COLLABORATOR]: [
    PERMISSIONS.SPECIMENS_CREATE,
    PERMISSIONS.SPECIMENS_EDIT_OWN,
    PERMISSIONS.CATALOGS_MANAGE,
    PERMISSIONS.REPORTS_GENERATE,
  ],
  [UserRole.VISITOR]: [],
};

/** Roles cuyos permisos se pueden ajustar por usuario */
export const CUSTOMIZABLE_ROLES: UserRole[] = [UserRole.COLLABORATOR];

export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as string[]).includes(value);
}
