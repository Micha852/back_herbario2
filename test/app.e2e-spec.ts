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
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const dbName =
  (process.env.DATABASE_URL ?? '').split('/').pop()?.split('?')[0] ?? '';
const SAFE_DB = /test|e2e|ci/i.test(dbName);

const ADMIN = { email: 'admin@uniamazonia.edu.co', password: 'Admin123' };
const VISITOR = { email: 'carlos.rodriguez@unal.edu.co', password: 'Visit123' };

(SAFE_DB ? describe : describe.skip)('Herbario (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;
  let adminToken: string;
  let visitorToken: string;
  let specimenId: string;
  const catalogNumber = `E2E-${Date.now()}`;

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
    adminToken = await login(ADMIN);
    visitorToken = await login(VISITOR);
  });

  afterAll(async () => {
    if (specimenId) {
      await request(http)
        .delete(`/api/v1/specimens/${specimenId}`)
        .set(auth(adminToken));
    }
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
  });
});

if (!SAFE_DB) {
  // Visible en la salida para que no parezca que pasó sin probar nada
  console.warn(
    `[e2e] Omitido: la base "${dbName || '(sin DATABASE_URL)'}" no parece de pruebas (debe contener test, e2e o ci).`,
  );
}
