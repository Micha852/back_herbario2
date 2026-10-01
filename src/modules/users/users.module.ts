import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersAdminService } from './users-admin.service';
import { UsersController } from './users.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [UsersController],
  providers: [UsersService, UsersAdminService],
  exports: [UsersService],
})
export class UsersModule {}
