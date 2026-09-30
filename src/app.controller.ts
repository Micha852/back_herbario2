import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { AppService } from './app.service';
import { PrismaService } from './database/prisma.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * GET /api/v1/health: para monitoreo y Docker (healthcheck).
   * 200 si la API y la base de datos responden; 503 si la base no responde.
   */
  @SkipThrottle()
  @Get('health')
  @ApiOperation({ summary: 'Health check (API + database)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'API y base de datos funcionando' })
  @ApiResponse({ status: HttpStatus.SERVICE_UNAVAILABLE, description: 'La base de datos no responde' })
  async health(@Res({ passthrough: true }) res: Response) {
    let database: 'up' | 'down' = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status: database === 'up' ? 'ok' : 'error',
      database,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
