import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TenantContext, TenantInfo } from '../../../tenancy/tenant-context';
import { slugList, tenantAppUrl } from '../../../tenancy/tenant-app-url';
import { PrismaService } from '../../../database/prisma.service';
import { UsersService } from '../../users/users.service';
import { AuthService } from '../auth.service';
import { EmailVerificationService } from '../email-verification.service';
import { ChairaService } from './chaira.service';

const tenant = (slug: string): TenantInfo => ({
  id: slug,
  slug,
  name: slug.toUpperCase(),
  dbName: `herbario_${slug}`,
});
const HUAZ = tenant('huaz');
const COAH = tenant('coah');

const ENV = {
  CHAIRA_CLIENT_ID: 'cliente-prueba',
  CHAIRA_HERBARIA: 'huaz',
  APP_URL: 'https://{herbario}.herbario.test',
};

function service(env: Record<string, string> = ENV) {
  const config = {
    get: (k: string) => env[k],
    getOrThrow: (k: string) => env[k],
  } as unknown as ConfigService;
  const jwt = new JwtService({ secret: 'secreto-de-prueba' });
  // Lo mínimo para crear "Visitante Chairá N" e iniciar sesión
  const prisma = {
    role: { findUniqueOrThrow: async () => ({ id: 'rol-visitante' }) },
    institution: { findFirst: async () => null },
    user: {
      count: async () => 0,
      create: async () => ({ id: 'u1' }),
    },
  } as unknown as PrismaService;
  const users = {
    findOne: async (id: string) => ({ id }),
  } as unknown as UsersService;
  const auth = {
    login: async () => ({ accessToken: 'acceso', refreshToken: 'refresco' }),
  } as unknown as AuthService;
  return new ChairaService(
    config,
    jwt,
    prisma,
    users,
    auth,
    {} as EmailVerificationService,
  );
}

/** state que Chairá devuelve tal cual: el que armó authorizationUrl() */
const stateFrom = (url: string) => new URL(url).searchParams.get('state')!;

describe('tenantAppUrl / slugList', () => {
  it('cambia {herbario} por el identificador del herbario', () => {
    expect(tenantAppUrl('https://{herbario}.herbario.co/', 'huaz')).toBe(
      'https://huaz.herbario.co',
    );
  });

  it('sin {herbario} se usa tal cual; con {herbario} y sin herbario, null', () => {
    expect(tenantAppUrl('https://herbariohuaz.com', 'coah')).toBe(
      'https://herbariohuaz.com',
    );
    expect(
      tenantAppUrl('https://{herbario}.herbario.co', undefined),
    ).toBeNull();
  });

  it('toma el herbario de la petición en curso', () => {
    TenantContext.run(COAH, () =>
      expect(tenantAppUrl('http://{herbario}.localhost:3000')).toBe(
        'http://coah.localhost:3000',
      ),
    );
  });

  it('lista de identificadores: sin espacios, minúsculas y sin vacíos', () => {
    expect([...slugList(' huaz, COAH ,,')]).toEqual(['huaz', 'coah']);
    expect(slugList(undefined).size).toBe(0);
  });
});

describe('Chairá solo en los herbarios de CHAIRA_HERBARIA', () => {
  it('habilitado en HUAZ, no en otro herbario ni fuera de un herbario', () => {
    const chaira = service();
    expect(TenantContext.run(HUAZ, () => chaira.enabled)).toBe(true);
    expect(TenantContext.run(COAH, () => chaira.enabled)).toBe(false);
    expect(chaira.enabled).toBe(false);
  });

  it('sin CHAIRA_HERBARIA o sin CHAIRA_CLIENT_ID no está en ninguno', () => {
    const sinLista = service({ ...ENV, CHAIRA_HERBARIA: '' });
    const sinCliente = service({ ...ENV, CHAIRA_CLIENT_ID: '' });
    expect(TenantContext.run(HUAZ, () => sinLista.enabled)).toBe(false);
    expect(TenantContext.run(HUAZ, () => sinCliente.enabled)).toBe(false);
  });

  it('el regreso vuelve al sitio del herbario con la sesión', async () => {
    const chaira = service();
    const back = await TenantContext.run(HUAZ, () =>
      chaira.handleCallback(stateFrom(chaira.authorizationUrl()), 'codigo'),
    );
    expect(back).toBe(
      'https://huaz.herbario.test/login/chaira#accessToken=acceso&refreshToken=refresco',
    );
  });

  it('un state firmado en otro herbario no sirve', async () => {
    const chaira = service({ ...ENV, CHAIRA_HERBARIA: 'huaz,coah' });
    const state = TenantContext.run(HUAZ, () =>
      stateFrom(chaira.authorizationUrl()),
    );
    const back = await TenantContext.run(COAH, () =>
      chaira.handleCallback(state, 'codigo'),
    );
    expect(back).toBe('https://coah.herbario.test/login?chaira=invalido');
  });

  it('un state inventado no sirve', async () => {
    const chaira = service();
    const back = await TenantContext.run(HUAZ, () =>
      chaira.handleCallback('no-es-un-jwt', 'codigo'),
    );
    expect(back).toBe('https://huaz.herbario.test/login?chaira=invalido');
  });
});
