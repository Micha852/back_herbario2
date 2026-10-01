import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/require-permissions.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({
    summary: 'Create a new project',
    description: 'Creates a new research project. Requires ADMIN role.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Project created successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Project name already exists',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Get all projects',
    description: 'Returns list of all active research projects. Public endpoint.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Projects retrieved successfully',
  })
  findAll() {
    return this.projectsService.findAll();
  }

  @Public()
  @Get('protocols')
  @ApiOperation({
    summary: 'Get all protocols',
    description: 'Returns list of collection protocols (transecto, parcela, etc.). Public endpoint.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Protocols retrieved successfully',
  })
  findAllProtocols() {
    return this.projectsService.findAllProtocols();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Post('protocols')
  @ApiOperation({
    summary: 'Create a new protocol',
    description: 'Creates a new collection protocol. Requires ADMIN role.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Protocol created successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Protocol name already exists',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  createProtocol(@Body('name') name: string) {
    return this.projectsService.createProtocol(name);
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Get project by ID',
    description: 'Returns project details with protocol and specimen count. Public endpoint.',
  })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found',
  })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a project',
    description: 'Updates project information. Requires ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Project name already exists',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  update(@Param('id') id: string, @Body() dto: Partial<CreateProjectDto>) {
    return this.projectsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_DELETE)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a project',
    description: 'Soft deletes a project (sets isActive to false). Requires ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
