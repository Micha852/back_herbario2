import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { InfoService } from './info.service';
import { CreateInfoDto, UpdateInfoDto } from './dto/update-info.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/require-permissions.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';

@ApiTags('System Information')
@Controller('info')
export class InfoController {
  constructor(private readonly infoService: InfoService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Get all system information',
    description: 'Returns all active information sections (public)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Information sections retrieved',
  })
  findAll() {
    return this.infoService.findAll();
  }

  @Public()
  @Get(':key')
  @ApiOperation({
    summary: 'Get information by key',
    description: 'Returns a specific information section by key (public)',
  })
  @ApiParam({
    name: 'key',
    description: 'Information key (history, data, contacts, terms)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Information section retrieved',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Information section not found',
  })
  findByKey(@Param('key') key: string) {
    return this.infoService.findByKey(key);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CMS_EDIT)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({
    summary: 'Create information section',
    description: 'Creates a new information section (admin only)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Information section created',
  })
  create(@Body() dto: CreateInfoDto) {
    return this.infoService.create(dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CMS_EDIT)
  @ApiBearerAuth()
  @Patch(':key')
  @ApiOperation({
    summary: 'Update information section',
    description: 'Updates an information section (admin only)',
  })
  @ApiParam({
    name: 'key',
    description: 'Information key to update',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Information section updated',
  })
  update(@Param('key') key: string, @Body() dto: UpdateInfoDto) {
    return this.infoService.update(key, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CMS_EDIT)
  @ApiBearerAuth()
  @Delete(':key')
  @ApiOperation({
    summary: 'Delete information section',
    description: 'Soft deletes an information section (admin only)',
  })
  @ApiParam({
    name: 'key',
    description: 'Information key to delete',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Information section deleted',
  })
  remove(@Param('key') key: string) {
    return this.infoService.remove(key);
  }
}
