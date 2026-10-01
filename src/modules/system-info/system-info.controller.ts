import {
    Controller,
    Get,
    Put,
    Param,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { SystemInfoService } from './system-info.service';
import { UpdateSystemInfoDto } from './dto/update-system-info.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/require-permissions.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';

@Controller('system-info')
export class SystemInfoController {
    constructor(private readonly systemInfoService: SystemInfoService) { }

    /**
     * GET /api/system-info
     * Obtiene todos los registros activos de SystemInfo
     * Endpoint público
     */
    @Public()
    @Get()
    async findAll() {
        return this.systemInfoService.findAll();
    }

    /**
     * GET /api/system-info/:key
     * Obtiene un registro específico por su key
     * Endpoint público (para que el frontend pueda consumirlo)
     */
    @Public()
    @Get(':key')
    async getByKey(@Param('key') key: string) {
        return this.systemInfoService.findByKey(key);
    }

    /**
     * PUT /api/v1/system-info/:key
     * Actualiza el contenido de un registro (solo ADMINISTRADOR)
     */
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermissions(PERMISSIONS.CMS_EDIT)
    @ApiBearerAuth()
    @Put(':key')
    @HttpCode(HttpStatus.OK)
    async update(
        @Param('key') key: string,
        @Body() updateDto: UpdateSystemInfoDto,
    ) {
        return this.systemInfoService.update(key, updateDto);
    }
}
