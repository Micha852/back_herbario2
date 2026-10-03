import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpStatus,
  Get,
  Patch,
  Delete,
  HttpCode,
  ForbiddenException,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '../users/enums/user-role.enum';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Auth')
// Aplica @Exclude() de UserEntity (nunca devolver el hash de la contraseña).
// No es global: class-transformer rompe la serialización de los Decimal de Prisma.
@UseInterceptors(ClassSerializerInterceptor)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user account with VISITANTE role by default',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already exists',
  })
  async register(@Body() registerDto: RegisterDto): Promise<LoginResponseDto> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // frena fuerza bruta
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({
    summary: 'Login user',
    description: 'Authenticates user and returns JWT tokens',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User logged in successfully',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  async login(
    @Body() loginDto: LoginDto,
    @CurrentUser() user: UserEntity,
  ): Promise<LoginResponseDto> {
    return this.authService.login(user);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generate a new access token using a refresh token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token refreshed successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid refresh token',
  })
  async refresh(
    @Body('refreshToken') refreshToken: string,
  ): Promise<{ accessToken: string }> {
    return this.authService.refreshToken(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the profile of the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile retrieved successfully',
    type: UserEntity,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  getProfile(@CurrentUser() user: UserEntity): UserEntity {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('profile')
  @ApiOperation({
    summary: 'Update own profile',
    description:
      'Lets the authenticated user update their name, email, gender, type and institution',
  })
  @ApiResponse({ status: HttpStatus.OK, type: UserEntity })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already exists',
  })
  updateProfile(
    @CurrentUser() user: UserEntity,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserEntity> {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('profile')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deactivate own account',
    description:
      'Soft-deletes the authenticated user. Administrators cannot deactivate themselves.',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Account deactivated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Un administrador no puede desactivar su propia cuenta',
  })
  async deactivateProfile(@CurrentUser() user: UserEntity): Promise<void> {
    if (user.role?.name === UserRole.ADMIN) {
      throw new ForbiddenException(
        'Un administrador no puede desactivar su propia cuenta',
      );
    }
    await this.usersService.remove(user.id);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password recovery',
    description: 'Sends a temporary password to the user email',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recovery email sent if account exists',
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto.email);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('change-password')
  @ApiOperation({
    summary: 'Change password',
    description: 'Change password for authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Current password incorrect',
  })
  async changePassword(
    @CurrentUser() user: UserEntity,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(
      user.id,
      currentPassword,
      newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('verify-password')
  @ApiOperation({
    summary: 'Verify current password',
    description:
      'Verify if the provided password is correct (for profile security)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns true if password is correct',
  })
  async verifyPassword(
    @CurrentUser() user: UserEntity,
    @Body('password') password: string,
  ): Promise<{ valid: boolean }> {
    const valid = await this.authService.verifyPassword(user.id, password);
    return { valid };
  }
}
