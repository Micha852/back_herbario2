import { UserRole } from '../users/enums/user-role.enum';
import { ALL_PERMISSIONS, PERMISSIONS, ROLE_DEFAULTS } from './permissions.constants';
import { canEditSpecimen, computeEffectivePermissions, overridesFor } from './permissions.logic';

describe('permissions.logic', () => {
  describe('computeEffectivePermissions', () => {
    it('ADMIN tiene todos los permisos', () => {
      expect(computeEffectivePermissions(UserRole.ADMIN)).toEqual(ALL_PERMISSIONS);
    });

    it('ADMIN ignora los ajustes (no se le pueden quitar permisos)', () => {
      const result = computeEffectivePermissions(UserRole.ADMIN, [
        { permission: PERMISSIONS.CMS_EDIT, granted: false },
      ]);
      expect(result).toContain(PERMISSIONS.CMS_EDIT);
      expect(result).toEqual(ALL_PERMISSIONS);
    });

    it('COLABORADOR sin ajustes = defaults del rol', () => {
      expect(computeEffectivePermissions(UserRole.COLLABORATOR).sort()).toEqual(
        [...ROLE_DEFAULTS[UserRole.COLLABORATOR]].sort(),
      );
    });

    it('COLABORADOR por defecto: edita solo las suyas, no cambia estado, no CMS, no modera', () => {
      const result = computeEffectivePermissions(UserRole.COLLABORATOR);
      expect(result).toContain(PERMISSIONS.SPECIMENS_CREATE);
      expect(result).toContain(PERMISSIONS.SPECIMENS_EDIT_OWN);
      expect(result).not.toContain(PERMISSIONS.SPECIMENS_EDIT_ANY);
      expect(result).not.toContain(PERMISSIONS.SPECIMENS_STATUS);
      expect(result).not.toContain(PERMISSIONS.SPECIMENS_DELETE);
      expect(result).not.toContain(PERMISSIONS.CMS_EDIT);
      expect(result).not.toContain(PERMISSIONS.COMMENTS_MODERATE);
    });

    it('COLABORADOR: los ajustes conceden y quitan permisos', () => {
      const result = computeEffectivePermissions(UserRole.COLLABORATOR, [
        { permission: PERMISSIONS.CMS_EDIT, granted: true },
        { permission: PERMISSIONS.REPORTS_GENERATE, granted: false },
      ]);
      expect(result).toContain(PERMISSIONS.CMS_EDIT);
      expect(result).not.toContain(PERMISSIONS.REPORTS_GENERATE);
    });

    it('VISITANTE no tiene permisos y los ajustes no le dan ninguno', () => {
      expect(computeEffectivePermissions(UserRole.VISITOR)).toEqual([]);
      expect(
        computeEffectivePermissions(UserRole.VISITOR, [{ permission: PERMISSIONS.CMS_EDIT, granted: true }]),
      ).toEqual([]);
    });

    it('ignora permisos desconocidos y roles inexistentes', () => {
      expect(
        computeEffectivePermissions(UserRole.COLLABORATOR, [{ permission: 'users.manage', granted: true }]),
      ).not.toContain('users.manage');
      expect(computeEffectivePermissions('SUPERHACKER')).toEqual([]);
      expect(computeEffectivePermissions(undefined)).toEqual([]);
    });
  });

  describe('overridesFor', () => {
    it('solo guarda las diferencias con los defaults del rol', () => {
      const desired = [...ROLE_DEFAULTS[UserRole.COLLABORATOR], PERMISSIONS.CMS_EDIT].filter(
        (permission) => permission !== PERMISSIONS.REPORTS_GENERATE,
      );
      expect(overridesFor(UserRole.COLLABORATOR, desired)).toEqual(
        expect.arrayContaining([
          { permission: PERMISSIONS.CMS_EDIT, granted: true },
          { permission: PERMISSIONS.REPORTS_GENERATE, granted: false },
        ]),
      );
      expect(overridesFor(UserRole.COLLABORATOR, desired)).toHaveLength(2);
    });

    it('sin cambios no genera ajustes', () => {
      expect(overridesFor(UserRole.COLLABORATOR, ROLE_DEFAULTS[UserRole.COLLABORATOR])).toEqual([]);
    });

    it('ida y vuelta: aplicar los ajustes da exactamente lo deseado', () => {
      const desired = [PERMISSIONS.SPECIMENS_CREATE, PERMISSIONS.SPECIMENS_STATUS, PERMISSIONS.COMMENTS_MODERATE];
      const overrides = overridesFor(UserRole.COLLABORATOR, desired);
      expect(computeEffectivePermissions(UserRole.COLLABORATOR, overrides).sort()).toEqual([...desired].sort());
    });
  });

  describe('canEditSpecimen', () => {
    const me = 'user-1';

    it('edit_any edita cualquier muestra, incluso sin autor', () => {
      expect(canEditSpecimen([PERMISSIONS.SPECIMENS_EDIT_ANY], me, 'otro')).toBe(true);
      expect(canEditSpecimen([PERMISSIONS.SPECIMENS_EDIT_ANY], me, null)).toBe(true);
    });

    it('edit_own solo edita las que registró', () => {
      expect(canEditSpecimen([PERMISSIONS.SPECIMENS_EDIT_OWN], me, me)).toBe(true);
      expect(canEditSpecimen([PERMISSIONS.SPECIMENS_EDIT_OWN], me, 'otro')).toBe(false);
    });

    it('edit_own no edita muestras sin autor (anteriores al registro de createdBy)', () => {
      expect(canEditSpecimen([PERMISSIONS.SPECIMENS_EDIT_OWN], me, null)).toBe(false);
      expect(canEditSpecimen([PERMISSIONS.SPECIMENS_EDIT_OWN], me, undefined)).toBe(false);
    });

    it('sin permisos de edición no edita nada', () => {
      expect(canEditSpecimen([PERMISSIONS.SPECIMENS_CREATE], me, me)).toBe(false);
      expect(canEditSpecimen([], me, me)).toBe(false);
    });
  });
});
