import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS } from './permissions.constants';
import { PermissionsGuard } from './permissions.guard';

function contextWith(user: unknown): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);
  const requireThese = (permissions: string[] | undefined) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(permissions);

  afterEach(() => jest.restoreAllMocks());

  it('deja pasar si el endpoint no exige permisos', () => {
    requireThese(undefined);
    expect(guard.canActivate(contextWith({ permissions: [] }))).toBe(true);
  });

  it('deja pasar si el usuario tiene alguno de los permisos exigidos', () => {
    requireThese([PERMISSIONS.SPECIMENS_EDIT_ANY, PERMISSIONS.SPECIMENS_EDIT_OWN]);
    expect(guard.canActivate(contextWith({ permissions: [PERMISSIONS.SPECIMENS_EDIT_OWN] }))).toBe(true);
  });

  it('bloquea con 403 si no tiene ninguno', () => {
    requireThese([PERMISSIONS.CMS_EDIT]);
    expect(() => guard.canActivate(contextWith({ permissions: [PERMISSIONS.SPECIMENS_CREATE] }))).toThrow(
      ForbiddenException,
    );
  });

  it('bloquea si no hay usuario o no trae permisos', () => {
    requireThese([PERMISSIONS.CMS_EDIT]);
    expect(() => guard.canActivate(contextWith(undefined))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(contextWith({}))).toThrow(ForbiddenException);
  });
});
