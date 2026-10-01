import { UserRole } from './enums/user-role.enum';
import {
  adminChangeError,
  generateTemporaryPassword,
} from './users-admin.logic';
import { PasswordUtil } from '../../common/utils/password.util';

describe('users-admin.logic', () => {
  const base = {
    actorId: 'admin-1',
    targetId: 'admin-2',
    currentRole: UserRole.ADMIN,
    currentIsActive: true,
    activeAdmins: 2,
  };

  describe('adminChangeError', () => {
    it('permite cambios que no quitan un admin', () => {
      expect(
        adminChangeError({
          ...base,
          currentRole: UserRole.VISITOR,
          newRole: UserRole.COLLABORATOR,
        }),
      ).toBeNull();
      expect(adminChangeError({ ...base, newRole: UserRole.ADMIN })).toBeNull();
      expect(adminChangeError({ ...base })).toBeNull();
    });

    it('un admin no puede quitarse su rol ni desactivarse', () => {
      const self = { ...base, targetId: 'admin-1' };
      expect(
        adminChangeError({ ...self, newRole: UserRole.COLLABORATOR }),
      ).toMatch(/No puedes/);
      expect(adminChangeError({ ...self, newIsActive: false })).toMatch(
        /No puedes/,
      );
    });

    it('no puede quedar el sistema sin administradores activos', () => {
      const last = { ...base, activeAdmins: 1 };
      expect(adminChangeError({ ...last, newRole: UserRole.VISITOR })).toMatch(
        /al menos un administrador/,
      );
      expect(adminChangeError({ ...last, newIsActive: false })).toMatch(
        /al menos un administrador/,
      );
    });

    it('con otro admin activo, sí se puede degradar o desactivar a un admin', () => {
      expect(
        adminChangeError({ ...base, newRole: UserRole.COLLABORATOR }),
      ).toBeNull();
      expect(adminChangeError({ ...base, newIsActive: false })).toBeNull();
    });

    it('un admin ya inactivo no cuenta como pérdida', () => {
      expect(
        adminChangeError({
          ...base,
          currentIsActive: false,
          activeAdmins: 1,
          newRole: UserRole.VISITOR,
        }),
      ).toBeNull();
    });
  });

  describe('generateTemporaryPassword', () => {
    it('cumple la política de contraseñas y no repite', () => {
      const seen = new Set<string>();
      for (let i = 0; i < 200; i++) {
        const password = generateTemporaryPassword();
        expect(password).toHaveLength(10);
        expect(PasswordUtil.validateStrength(password).isValid).toBe(true);
        expect(password).not.toMatch(/[0O1lI]/);
        seen.add(password);
      }
      expect(seen.size).toBe(200);
    });
  });
});
