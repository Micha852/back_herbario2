import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Project created' })
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Projects retrieved' })
  findAll() {
    return this.projectsService.findAll();
  }

  @Get('protocols')
  @ApiOperation({ summary: 'Get all protocols' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Protocols retrieved' })
  findAllProtocols() {
    return this.projectsService.findAllProtocols();
  }

  @Post('protocols')
  @ApiOperation({ summary: 'Create a new protocol' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Protocol created' })
  createProtocol(@Body('name') name: string) {
    return this.projectsService.createProtocol(name);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Project retrieved' })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Project updated' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateProjectDto>) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Project deleted' })
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
