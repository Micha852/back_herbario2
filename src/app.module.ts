import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Core modules
import { DatabaseModule } from './database/database.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ImagesModule } from './modules/images/images.module';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { SpecimensModule } from './modules/specimens/specimens.module';
import { CommentsModule } from './modules/comments/comments.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { MailModule } from './modules/mail/mail.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { InfoModule } from './modules/info/info.module';
import { SystemInfoModule } from './modules/system-info/system-info.module';
import { GendersModule } from './modules/genders/genders.module';
import { InstitutionsModule } from './modules/institutions/institutions.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),

    // Serve static files (uploads - for local Cloudinary-like service)
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    // Rate limiting
    // Límite general por IP (login/registro tienen límites propios en AuthController)
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 300 }],
      errorMessage: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
    }),

    // Core modules
    DatabaseModule,
    MailModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ImagesModule,
    TaxonomyModule,
    LocationsModule,
    ProjectsModule,
    SpecimensModule,
    CommentsModule,
    PermissionsModule,
    ReportsModule,
    FeedbackModule,
    InfoModule,
    SystemInfoModule,
    GendersModule,
    InstitutionsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule { }
