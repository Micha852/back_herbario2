import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';

/**
 * Configuración global de la app (la usan main.ts y los tests e2e,
 * para que el e2e pruebe exactamente lo mismo que corre en producción).
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // quita propiedades sin decorador
      forbidNonWhitelisted: true, // y rechaza las desconocidas
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}
