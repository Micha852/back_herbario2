import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get configuration
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';

  // Enable CORS
  app.enableCors({
    origin:
      configService.get<string>('CORS_ORIGIN') || 'http://localhost:3000',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Auto-convert types
      },
    }),
  );

  // Increase payload size limit for image uploads
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Swagger documentation
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('HDUA - Herbario Digital Universidad Amazonia API')
      .setDescription(
        'Professional REST API for botanical specimen management with image processing service (Cloudinary-like)',
      )
      .setVersion('1.0')
      .setContact(
        'Universidad de la Amazonia',
        'https://www.uniamazonia.edu.co',
        'contacto@uniamazonia.edu.co',
      )
      .addTag('Images', 'Image management and processing (upload, transform, delete)')
      .addTag('Auth', 'Authentication and authorization')
      .addTag('Users', 'User management')
      .addTag('Specimens', 'Botanical specimen management')
      .addTag('Taxonomy', 'Taxonomic classification')
      .addTag('Locations', 'Geographic locations')
      .addTag('Projects', 'Research projects')
      .addTag('Comments', 'User comments')
      .addTag('Reports', 'Report generation')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'HDUA API Documentation',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    console.log('\n🚀 Swagger documentation available at: http://localhost:' + port + '/api/docs\n');
  }

  await app.listen(port);

  console.log(`
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║   🌿 HDUA - Herbario Digital Universidad Amazonia 🌿    ║
    ║                                                           ║
    ║   Environment: ${nodeEnv.padEnd(46)}║
    ║   Port:        ${String(port).padEnd(46)}║
    ║   API Docs:    http://localhost:${port}/api/docs${' '.repeat(22)}║
    ║   Health:      http://localhost:${port}/api/v1/health${' '.repeat(17)}║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
