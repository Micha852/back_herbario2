import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
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

    // MongoDB connection for images
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI') ||
          'mongodb://localhost:27017/herbario_images',
      }),
      inject: [ConfigService],
    }),

    // Serve static files (uploads)
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute
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
