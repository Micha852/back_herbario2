/**
 * E2E de los flujos principales contra una base real (con migraciones y el seed aplicados).
 *
 * Local:
 *   DATABASE_URL=".../herbario_e2e?schema=public" npx prisma migrate deploy
 *   DATABASE_URL=".../herbario_e2e?schema=public" npm run prisma:seed
 *   DATABASE_URL=".../herbario_e2e?schema=public" npm run test:e2e
 *
 * Seguro: solo corre si el nombre de la base contiene "test", "e2e" o "ci"
 * (crea y borra muestras: nunca debe apuntar a la base de desarrollo).
 */

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import * as sharp from 'sharp';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/modules/mail/mail.service';

const dbName =
  (process.env.DATABASE_URL ?? '').split('/').pop()?.split('?')[0] ?? '';
const SAFE_DB = /test|e2e|ci/i.test(dbName);

const ADMIN = { email: 'admin@uniamazonia.edu.co', password: 'Admin123' };
const VISITOR = { email: 'carlos.rodriguez@unal.edu.co', password: 'Visit123' };
const COLLABORATOR = {
  email: 'maria.garcia@uniamazonia.edu.co',
  password: 'Collab123',
};

(SAFE_DB ? describe : describe.skip)('Herbario (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;
  let adminToken: string;
  let visitorToken: string;
  let collaboratorToken: string;
  let registeredToken: string;
  let specimenId: string;
  const catalogNumber = `E2E-${Date.now()}`;
  /** Todo lo que se crea aquí se borra al final (muestras, usuarios, imágenes) */
  const created = {
    specimens: [] as string[],
    users: [] as string[],
    images: [] as string[],
  };
  /** Correos "enviados": se interceptan para leer los códigos y no mandar nada real */
  let sentMail: jest.SpyInstance;
  const lastCode = () => {
    const subject: string = sentMail.mock.calls.at(-1)?.[0]?.subject ?? '';
    return subject.match(/\d{6}/)?.[0] ?? '';
  };

  const login = async (credentials: { email: string; password: string }) => {
    // POST sin @HttpCode: Nest responde 201
    const res = await request(http)
      .post('/api/v1/auth/login')
      .send(credentials)
      .expect(201);
    return res.body.accessToken as string;
  };
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    http = app.getHttpServer();
    sentMail = jest
      .spyOn(app.get(MailService), 'sendMail')
      .mockResolvedValue(undefined as never);
    adminToken = await login(ADMIN);
    visitorToken = await login(VISITOR);
    collaboratorToken = await login(COLLABORATOR);
  });

  afterAll(async () => {
    const del = (path: string) =>
      request(http).delete(`/api/v1/${path}`).set(auth(adminToken));
    for (const id of [specimenId, ...created.specimens].filter(Boolean))
      await del(`specimens/${id}`);
    for (const id of created.images) await del(`images/${id}`);
    for (const id of created.users) await del(`users/${id}`);
    await app?.close();
  });

  it('health responde con la base arriba', async () => {
    const res = await request(http).get('/api/v1/health').expect(200);
    expect(res.body.database).toBe('up');
  });

  describe('autenticación', () => {
    it('rechaza una contraseña incorrecta', () =>
      request(http)
        .post('/api/v1/auth/login')
        .send({ ...ADMIN, password: 'Mala1234' })
        .expect(401));

    it('el perfil trae los permisos efectivos', async () => {
      const res = await request(http)
        .get('/api/v1/auth/profile')
        .set(auth(adminToken))
        .expect(200);
      expect(res.body.permissions).toEqual(
        expect.arrayContaining(['specimens.create', 'reports.generate']),
      );
      expect(res.body.password).toBeUndefined();
    });

    it('un refresh token inválido devuelve 401', () =>
      request(http)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'no-es-un-token' })
        .expect(401));
  });

  describe('muestras', () => {
    it('un visitante no puede crear muestras', () =>
      request(http)
        .post('/api/v1/specimens')
        .set(auth(visitorToken))
        .send({ scientificName: 'Prueba visitante' })
        .expect(403));

    it('valida la coherencia (elevación mínima > máxima)', () =>
      request(http)
        .post('/api/v1/specimens')
        .set(auth(adminToken))
        .send({
          scientificName: 'Inga edulis',
          minElevation: 500,
          maxElevation: 100,
        })
        .expect(400));

    it('el admin crea una muestra', async () => {
      const res = await request(http)
        .post('/api/v1/specimens')
        .set(auth(adminToken))
        .send({
          scientificName: 'Inga edulis',
          commonName: 'Guamo',
          catalogNumber,
          collectionDate: '2024-05-10',
          latitude: 1.61438,
          longitude: -75.6062317,
          minElevation: 240,
          maxElevation: 280,
          identifiedBy: 'E2E',
          dateIdentified: '2024-05',
        })
        .expect(201);
      specimenId = res.body.id;
      expect(res.body.catalogNumber).toBe(catalogNumber);
      expect(res.body.source).toBe('MANUAL');
      expect(JSON.stringify(res.body)).not.toContain('password');
    });

    it('es pública en la consulta y en el listado', async () => {
      await request(http).get(`/api/v1/specimens/${specimenId}`).expect(200);
      const res = await request(http)
        .get(`/api/v1/specimens?search=${catalogNumber}`)
        .expect(200);
      expect(res.body.data.map((s: { id: string }) => s.id)).toContain(
        specimenId,
      );
    });

    it('filtra por origen manual', async () => {
      const res = await request(http)
        .get(`/api/v1/specimens?search=${catalogNumber}&source=IMPORT`)
        .set(auth(adminToken))
        .expect(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('informes y descargas', () => {
    it('ficha técnica en PDF (pública)', async () => {
      const res = await request(http)
        .get(`/api/v1/reports/specimens/${specimenId}/sheet`)
        .expect(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.body.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('la etiqueta de herbario exige imagen', () =>
      request(http)
        .get(`/api/v1/reports/specimens/${specimenId}/sheet?style=label`)
        .expect(400));

    it('Darwin Core CSV incluye la muestra con el término occurrenceID', async () => {
      const res = await request(http)
        .get('/api/v1/darwin-core/export?format=csv')
        .set(auth(adminToken))
        .expect(200);
      expect(res.text.split('\r\n')[0]).toContain('occurrenceID,basisOfRecord');
      expect(res.text).toContain(catalogNumber);
    });

    it('un visitante no puede exportar', () =>
      request(http)
        .get('/api/v1/darwin-core/export')
        .set(auth(visitorToken))
        .expect(403));

    it('estadísticas públicas', async () => {
      const res = await request(http)
        .get('/api/v1/reports/statistics')
        .expect(200);
      expect(res.body.totals.specimens).toBeGreaterThan(0);
    });
  });

  describe('importación Darwin Core', () => {
    const csv = [
      'catalogNumber,scientificName,family,genus,specificEpithet,year,month,day,recordedBy',
      `${catalogNumber}-IMP,Piper aduncum,Piperaceae,Piper,aduncum,2020,9,15,Persona Externa`,
      `${catalogNumber},Repetida,,,,,,,`,
    ].join('\r\n');

    it('la vista previa no guarda nada y detecta duplicados', async () => {
      const res = await request(http)
        .post('/api/v1/darwin-core/import')
        .set(auth(adminToken))
        .attach('file', Buffer.from(csv), 'prueba.csv')
        .expect(200);
      expect(res.body.committed).toBe(false);
      expect(res.body.summary).toMatchObject({
        toImport: 1,
        duplicates: 1,
        errors: 0,
        imported: 0,
      });

      const after = await request(http)
        .get(`/api/v1/specimens?search=${catalogNumber}-IMP`)
        .expect(200);
      expect(after.body.data).toHaveLength(0);
    });

    it('un visitante no puede importar', () =>
      request(http)
        .post('/api/v1/darwin-core/import')
        .set(auth(visitorToken))
        .attach('file', Buffer.from(csv), 'prueba.csv')
        .expect(403));

    it('al confirmar importa solo lo nuevo y enlaza la taxonomía', async () => {
      const res = await request(http)
        .post('/api/v1/darwin-core/import')
        .set(auth(adminToken))
        .field('commit', 'true')
        .attach('file', Buffer.from(csv), 'prueba.csv')
        .expect(200);
      expect(res.body.committed).toBe(true);
      expect(res.body.summary).toMatchObject({ imported: 1, duplicates: 1 });

      const list = await request(http)
        .get(`/api/v1/specimens?search=${catalogNumber}-IMP`)
        .expect(200);
      expect(list.body.data).toHaveLength(1);
      created.specimens.push(list.body.data[0].id);

      const detail = await request(http)
        .get(`/api/v1/specimens/${list.body.data[0].id}`)
        .expect(200);
      expect(detail.body.source).toBe('IMPORT');
      expect(JSON.stringify(detail.body)).toContain('Piperaceae');
    });

    it('reimportar el mismo archivo no duplica', async () => {
      const res = await request(http)
        .post('/api/v1/darwin-core/import')
        .set(auth(adminToken))
        .field('commit', 'true')
        .attach('file', Buffer.from(csv), 'prueba.csv')
        .expect(200);
      expect(res.body.summary).toMatchObject({ imported: 0, duplicates: 2 });
    });
  });

  describe('mapa', () => {
    it('agrupa la muestra en sus coordenadas (nunca en 0,0)', async () => {
      const res = await request(http)
        .get(`/api/v1/specimens/map?search=${catalogNumber}`)
        .expect(200);
      const group = res.body.groups.find((g: { specimens: { id: string }[] }) =>
        g.specimens.some((s) => s.id === specimenId),
      );
      expect(group).toMatchObject({ lat: 1.61438, lng: -75.6062317 });
      // La importada no tiene coordenadas: cuenta aparte, sin punto falso
      expect(res.body.withoutCoordinates).toBeGreaterThanOrEqual(1);
      expect(
        res.body.groups.some(
          (g: { lat: number; lng: number }) => g.lat === 0 && g.lng === 0,
        ),
      ).toBe(false);
    });
  });

  describe('permisos del colaborador', () => {
    it('puede crear muestras', async () => {
      const res = await request(http)
        .post('/api/v1/specimens')
        .set(auth(collaboratorToken))
        .send({
          scientificName: 'Inga edulis',
          catalogNumber: `${catalogNumber}-COL`,
        })
        .expect(201);
      created.specimens.push(res.body.id);
    });

    it('exporta (trae "Generar informes" por defecto)', () =>
      request(http)
        .get('/api/v1/darwin-core/export?format=csv')
        .set(auth(collaboratorToken))
        .expect(200));

    it('no puede importar ni editar el sitio', async () => {
      await request(http)
        .post('/api/v1/darwin-core/import')
        .set(auth(collaboratorToken))
        .attach('file', Buffer.from('catalogNumber\r\nX'), 'x.csv')
        .expect(403);
      await request(http)
        .put('/api/v1/system-info/inicio')
        .set(auth(collaboratorToken))
        .send({ content: '{}' })
        .expect(403);
    });

    it('no puede listar usuarios', () =>
      request(http)
        .get('/api/v1/users')
        .set(auth(collaboratorToken))
        .expect(403));
  });

  describe('registro con código al correo', () => {
    const email = `e2e.${Date.now()}@example.com`;
    const account = { name: 'Persona E2E', email, password: 'Prueba123' };

    it('paso 1 envía un código de 6 dígitos al correo', async () => {
      await request(http)
        .post('/api/v1/auth/register/code')
        .send(account)
        .expect(200);
      expect(sentMail).toHaveBeenLastCalledWith(
        expect.objectContaining({ to: email }),
      );
      expect(lastCode()).toMatch(/^\d{6}$/);
    });

    it('un código incorrecto no crea la cuenta', async () => {
      const wrong = lastCode() === '000000' ? '111111' : '000000';
      await request(http)
        .post('/api/v1/auth/register')
        .send({ ...account, code: wrong })
        .expect(400);
      await request(http)
        .post('/api/v1/auth/login')
        .send({ email, password: account.password })
        .expect(401);
    });

    it('con el código correcto crea un visitante y entra', async () => {
      const res = await request(http)
        .post('/api/v1/auth/register')
        .send({ ...account, code: lastCode() })
        .expect(201);
      expect(res.body.accessToken).toBeTruthy();
      const profile = await request(http)
        .get('/api/v1/auth/profile')
        .set(auth(res.body.accessToken))
        .expect(200);
      created.users.push(profile.body.id);
      registeredToken = res.body.accessToken;
      expect(JSON.stringify(profile.body.role)).toContain('VISITANTE');
      expect(profile.body.permissions).not.toContain('specimens.create');
    });

    it('el código es de un solo uso y el correo ya no está libre', async () => {
      await request(http)
        .post('/api/v1/auth/register')
        .send({ ...account, code: lastCode() })
        .expect((r) => expect([400, 409]).toContain(r.status));
      await request(http)
        .post('/api/v1/auth/register/code')
        .send(account)
        .expect(409);
    });

    describe('cambiar el correo en mi perfil', () => {
      const newEmail = `e2e.nuevo.${Date.now()}@example.com`;
      const patch = (body: object) =>
        request(http)
          .patch('/api/v1/auth/profile')
          .set(auth(registeredToken))
          .send(body);

      it('sin código no cambia', async () => {
        await patch({ email: newEmail }).expect(400);
        await request(http)
          .post('/api/v1/auth/login')
          .send({ email, password: account.password })
          .expect(201);
      });

      it('no se pide código para un correo ocupado ni para el propio', async () => {
        const sendCode = (to: string) =>
          request(http)
            .post('/api/v1/auth/profile/email/code')
            .set(auth(registeredToken))
            .send({ email: to });
        await sendCode(ADMIN.email.toUpperCase()).expect(409);
        await sendCode(email).expect(400);
      });

      it('con el código del correo nuevo cambia y se avisa al anterior', async () => {
        await request(http)
          .post('/api/v1/auth/profile/email/code')
          .set(auth(registeredToken))
          .send({ email: newEmail.toUpperCase() })
          .expect(200);
        expect(sentMail).toHaveBeenLastCalledWith(
          expect.objectContaining({ to: newEmail }),
        );
        const code = lastCode();
        await patch({
          email: newEmail,
          emailCode: code === '000000' ? '111111' : '000000',
        }).expect(400);

        const res = await patch({ email: newEmail, emailCode: code }).expect(
          200,
        );
        expect(res.body.email).toBe(newEmail);
        expect(sentMail).toHaveBeenLastCalledWith(
          expect.objectContaining({ to: email }),
        );

        await request(http)
          .post('/api/v1/auth/login')
          .send({ email: newEmail, password: account.password })
          .expect(201);
        await request(http)
          .post('/api/v1/auth/login')
          .send({ email, password: account.password })
          .expect(401);
      });
    });
  });

  describe('un correo = una cuenta (sin importar mayúsculas)', () => {
    it('no se registra un correo existente escrito con otras mayúsculas', () =>
      request(http)
        .post('/api/v1/auth/register/code')
        .send({
          name: 'Copia',
          email: '  Carlos.Rodriguez@UNAL.edu.co ',
          password: 'Prueba123',
        })
        .expect(409));

    it('el login acepta el correo con otras mayúsculas', () =>
      request(http)
        .post('/api/v1/auth/login')
        .send({ ...VISITOR, email: VISITOR.email.toUpperCase() })
        .expect(201));

    it('en mi perfil no puedo poner el correo de otra cuenta', () =>
      request(http)
        .patch('/api/v1/auth/profile')
        .set(auth(visitorToken))
        .send({ email: 'MARIA.GARCIA@uniamazonia.edu.co' })
        .expect(409));

    it('ni el dominio interno de Chairá', () =>
      request(http)
        .patch('/api/v1/auth/profile')
        .set(auth(visitorToken))
        .send({ email: 'visitante.chaira.1@chaira.local' })
        .expect(400));

    it('mi propio correo sí (y se guarda normalizado)', async () => {
      const res = await request(http)
        .patch('/api/v1/auth/profile')
        .set(auth(visitorToken))
        .send({ email: VISITOR.email.toUpperCase() })
        .expect(200);
      expect(res.body.email).toBe(VISITOR.email);
    });

    it('el admin tampoco crea ni edita usuarios con un correo ocupado', async () => {
      await request(http)
        .post('/api/v1/users')
        .set(auth(adminToken))
        .send({
          name: 'Copia',
          email: 'Juan.Perez@uniamazonia.edu.co',
          role: 'VISITANTE',
          password: 'Prueba123',
        })
        .expect(409);
      const list = await request(http)
        .get(`/api/v1/users?search=${COLLABORATOR.email}`)
        .set(auth(adminToken))
        .expect(200);
      await request(http)
        .patch(`/api/v1/users/${list.body.data[0].id}`)
        .set(auth(adminToken))
        .send({ email: ADMIN.email.toUpperCase() })
        .expect(409);
    });
  });

  describe('imágenes del sitio (CMS)', () => {
    let original: string | null = null;
    const png = () =>
      sharp({
        create: { width: 64, height: 64, channels: 4, background: '#2e7d32' },
      })
        .png()
        .toBuffer();
    const upload = async (token: string) => {
      const res = await request(http)
        .post('/api/v1/images/upload')
        .set(auth(token))
        .attach('file', await png(), 'logo.png')
        .expect(201);
      created.images.push(res.body.id);
      return res.body.id as string;
    };
    const saveHome = (logoImageId: string | null) =>
      request(http)
        .put('/api/v1/system-info/inicio')
        .set(auth(adminToken))
        .send({ content: JSON.stringify({ logoImageId }) })
        .expect(200);

    beforeAll(async () => {
      const res = await request(http).get('/api/v1/system-info/inicio');
      original = res.status === 200 ? res.body.content : null;
    });
    afterAll(async () => {
      // Deja la configuración como estaba (sin imágenes de esta prueba)
      if (original !== null)
        await request(http)
          .put('/api/v1/system-info/inicio')
          .set(auth(adminToken))
          .send({ content: original });
    });

    it('un visitante no puede subir imágenes', async () =>
      request(http)
        .post('/api/v1/images/upload')
        .set(auth(visitorToken))
        .attach('file', await png(), 'logo.png')
        .expect(403));

    it('al reemplazar el logo, el anterior se borra (no quedan huérfanas)', async () => {
      const first = await upload(adminToken);
      await saveHome(first);
      await request(http)
        .get(`/api/v1/images/${first}?version=thumbnail`)
        .expect(200);

      const second = await upload(adminToken);
      await saveHome(second);
      await request(http).get(`/api/v1/images/${first}/metadata`).expect(404);
      await request(http)
        .get(`/api/v1/images/${second}?version=large`)
        .expect(200);

      // Quitar el logo (volver al predeterminado) también lo borra
      await saveHome(null);
      await request(http).get(`/api/v1/images/${second}/metadata`).expect(404);
    });
  });
});

if (!SAFE_DB) {
  // Visible en la salida para que no parezca que pasó sin probar nada
  console.warn(
    `[e2e] Omitido: la base "${dbName || '(sin DATABASE_URL)'}" no parece de pruebas (debe contener test, e2e o ci).`,
  );
}
