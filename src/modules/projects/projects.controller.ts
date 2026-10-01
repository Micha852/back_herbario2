import {
  Controller,
  Get,
  Param,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

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

}
