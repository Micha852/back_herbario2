import { Throttle } from '@nestjs/throttler';
import { Controller, Post, Body, UseGuards, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';

@ApiTags('Feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // evita que se use para llenar el correo del herbario
  @Post()
  @ApiOperation({
    summary: 'Send feedback or suggestion',
    description:
      'Sends a suggestion or comment to the herbarium administrators',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feedback sent successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User must be authenticated',
  })
  async sendFeedback(
    @Body() dto: CreateFeedbackDto,
    @CurrentUser() user: UserEntity,
  ): Promise<{ message: string }> {
    return this.feedbackService.sendFeedback(dto, user.name, user.email);
  }
}
