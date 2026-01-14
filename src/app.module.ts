import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { ReportsModule } from './modules/reports/reports.module';
import { MailModule } from './modules/mail/mail.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { InfoModule } from './modules/info/info.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Serve static files (uploads - for local Cloudinary-like service)
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

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
    ReportsModule,
    FeedbackModule,
    InfoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
