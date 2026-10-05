import { Throttle } from '@nestjs/throttler';
import {
  Body,
  Controller,
  Headers,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';

@ApiTags('Feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  // Con sesión usa la cuenta; sin sesión pide nombre y correo (público: /contacto)
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  // Por persona (IP real detrás de nginx: TRUST_PROXY); evita llenar el correo del herbario
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @Post()
  @ApiOperation({
    summary: 'Escríbenos: pregunta o sugerencia al herbario',
    description:
      'Llega por correo al herbario con Responder a = quien escribe. Sin sesión, name y email son obligatorios.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mensaje enviado',
  })
  async sendFeedback(
    @Body() dto: CreateFeedbackDto,
    @CurrentUser() user: UserEntity | null,
    @Headers('authorization') authorization?: string,
  ): Promise<{ message: string }> {
    // Llegó un token pero ya no sirve (sesión vencida): 401 para que el front renueve la
    // sesión y reintente, en vez de tratar a la persona como visitante sin cuenta
    if (!user && authorization) {
      throw new UnauthorizedException('Tu sesión venció');
    }
    return this.feedbackService.sendFeedback(
      dto,
      user ? { name: user.name, email: user.email } : undefined,
    );
  }
}
