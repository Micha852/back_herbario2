import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantContext } from './tenant-context';

/** Datos públicos del herbario de la petición (el front los usa para el título y para saber si existe) */
@ApiTags('Herbario')
@Controller('herbario')
export class HerbariumController {
  @Get()
  @ApiOperation({
    summary: 'Herbario actual (según el subdominio)',
    description: '404 si el subdominio no es un herbario de la plataforma.',
  })
  current() {
    // El middleware ya respondió 404/403/503 si no hay herbario activo
    const tenant = TenantContext.current()!;
    return { slug: tenant.slug, name: tenant.name };
  }
}
