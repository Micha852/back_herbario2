import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SpecimensService } from './specimens.service';
import { CreateSpecimenDto } from './dto/create-specimen.dto';
import { SearchSpecimenDto } from './dto/search-specimen.dto';
import { UpdateSpecimenDto } from './dto/update-specimen.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/require-permissions.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { PermissionsService } from '../permissions/permissions.service';
import { hasPermission } from '../permissions/permissions.logic';

/** ADMIN y COLABORADOR ven muestras inactivas; el público solo las activas */
/** Ver muestras inactivas requiere el permiso de activar/inactivar */
function canSeeInactive(user: UserEntity | null): boolean {
  return hasPermission(user?.permissions, PERMISSIONS.SPECIMENS_STATUS);
}

/** Cambiar isActive (crear inactiva o activar/inactivar) requiere specimens.status */
function assertCanChangeStatus(user: UserEntity, isActive: boolean | undefined, creating = false) {
  if (isActive === undefined || (creating && isActive)) return;
  if (!hasPermission(user.permissions, PERMISSIONS.SPECIMENS_STATUS)) {
    throw new ForbiddenException('No tienes permiso para activar o inactivar muestras');
  }
}

@ApiTags('Specimens')
@Controller('specimens')
export class SpecimensController {
  constructor(
    private readonly specimensService: SpecimensService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.SPECIMENS_CREATE)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({
    summary: 'Create a new specimen',
    description: 'Creates a new botanical specimen with taxonomic classification and geographic data. Requires ADMIN or COLLABORATOR role.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Specimen created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid data provided',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  create(@Body() dto: CreateSpecimenDto, @CurrentUser() user: UserEntity) {
    assertCanChangeStatus(user, dto.isActive, true);
    return this.specimensService.create(dto, user.id);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  @ApiOperation({
    summary: 'Search specimens',
    description:
      'Search specimens with filters (text, taxonomy, location, dates, project, collector) and pagination. Public endpoint: anonymous users and visitors only get active specimens.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Specimens retrieved successfully with pagination metadata',
  })
  findAll(
    @Query() searchDto: SearchSpecimenDto,
    @CurrentUser() user: UserEntity | null,
  ) {
    if (!canSeeInactive(user)) {
      searchDto.isActive = true;
    }
    return this.specimensService.findAll(searchDto);
  }

  @Public()
  @Get('reference/origins')
  @ApiOperation({
    summary: 'Get all origins',
    description: 'Returns list of specimen origins (Nativa, Introducida, Endémica, etc.)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Origins list retrieved',
  })
  getOrigins() {
    return this.specimensService.getOrigins();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Post('reference/origins')
  @ApiOperation({
    summary: 'Create a new origin',
    description: 'Creates a new origin type. Requires ADMIN role.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Origin created',
  })
  createOrigin(@Body('name') name: string) {
    return this.specimensService.createOrigin(name);
  }

  @Public()
  @Get('reference/conditions')
  @ApiOperation({
    summary: 'Get all conditions',
    description: 'Returns list of specimen conditions (Fértil, Estéril, Con flor, etc.)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conditions list retrieved',
  })
  getConditions() {
    return this.specimensService.getConditions();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Post('reference/conditions')
  @ApiOperation({
    summary: 'Create a new condition',
    description: 'Creates a new condition type. Requires ADMIN role.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Condition created',
  })
  createCondition(@Body('name') name: string) {
    return this.specimensService.createCondition(name);
  }

  @Public()
  @Get('reference/origin-types')
  @ApiOperation({
    summary: 'Get all origin types',
    description: 'Returns list of origin types (Silvestre, Cultivado, Asilvestrado)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Origin types list retrieved',
  })
  getOriginTypes() {
    return this.specimensService.getOriginTypes();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Post('reference/origin-types')
  @ApiOperation({
    summary: 'Create a new origin type',
    description: 'Creates a new origin type. Requires ADMIN role.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Origin type created',
  })
  createOriginType(@Body('name') name: string) {
    return this.specimensService.createOriginType(name);
  }

  @Public()
  @Get('reference/habitats')
  @ApiOperation({
    summary: 'Get all habitats',
    description: 'Returns list of habitats (Bosque primario, Bosque secundario, etc.)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Habitats list retrieved',
  })
  getHabitats() {
    return this.specimensService.getHabitats();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Post('reference/habitats')
  @ApiOperation({
    summary: 'Create a new habitat',
    description: 'Creates a new habitat type. Requires ADMIN role.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Habitat created',
  })
  createHabitat(@Body('name') name: string) {
    return this.specimensService.createHabitat(name);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  @ApiOperation({
    summary: 'Get specimen by ID',
    description: 'Returns a specimen with all its relations (taxonomy, location, collectors, images, comments)',
  })
  @ApiParam({ name: 'id', description: 'Specimen UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Specimen retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Specimen not found',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: UserEntity | null) {
    return this.specimensService.findOne(id, canSeeInactive(user));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.SPECIMENS_EDIT_ANY, PERMISSIONS.SPECIMENS_EDIT_OWN, PERMISSIONS.SPECIMENS_STATUS)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a specimen',
    description: 'Updates specimen data. Requires ADMIN or COLLABORATOR role.',
  })
  @ApiParam({ name: 'id', description: 'Specimen UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Specimen updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Specimen not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSpecimenDto,
    @CurrentUser() user: UserEntity,
  ) {
    assertCanChangeStatus(user, dto.isActive);
    // Con solo isActive basta specimens.status; cualquier otro campo exige poder editarla
    const onlyStatus = Object.keys(dto).every((key) => key === 'isActive');
    if (!onlyStatus || !hasPermission(user.permissions, PERMISSIONS.SPECIMENS_STATUS)) {
      await this.permissionsService.assertCanEditSpecimen(user, id);
    }
    return this.specimensService.update(id, dto, user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.SPECIMENS_EDIT_ANY, PERMISSIONS.SPECIMENS_EDIT_OWN)
  @ApiBearerAuth()
  @Patch(':id/image')
  @ApiOperation({
    summary: 'Update specimen primary image',
    description: 'Associates an image with the specimen. Requires ADMIN or COLLABORATOR role.',
  })
  @ApiParam({ name: 'id', description: 'Specimen UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Image updated successfully',
  })
  async updateImage(
    @Param('id') id: string,
    @Body('imageId') imageId: string,
    @CurrentUser() user: UserEntity,
  ) {
    await this.permissionsService.assertCanEditSpecimen(user, id);
    return this.specimensService.updateImage(id, imageId, user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.SPECIMENS_DELETE)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a specimen',
    description: 'Soft deletes a specimen (sets isActive to false). Requires ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Specimen UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Specimen deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Specimen not found',
  })
  remove(@Param('id') id: string) {
    return this.specimensService.remove(id);
  }

  @Public()
  @Get(':id/collectors')
  @ApiOperation({
    summary: 'Get specimen collectors',
    description: 'Returns the list of collectors associated with the specimen',
  })
  @ApiParam({ name: 'id', description: 'Specimen UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collectors retrieved successfully',
  })
  getCollectors(@Param('id') id: string) {
    return this.specimensService.getCollectors(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.SPECIMENS_EDIT_ANY, PERMISSIONS.SPECIMENS_EDIT_OWN)
  @ApiBearerAuth()
  @Post(':id/collectors/:userId')
  @ApiOperation({
    summary: 'Add collector to specimen',
    description: 'Associates a user as collector of the specimen. Requires ADMIN or COLLABORATOR role.',
  })
  @ApiParam({ name: 'id', description: 'Specimen UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID to add as collector' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collector added successfully',
  })
  async addCollector(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: UserEntity,
  ) {
    await this.permissionsService.assertCanEditSpecimen(user, id);
    return this.specimensService.addCollector(id, userId, user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.SPECIMENS_EDIT_ANY, PERMISSIONS.SPECIMENS_EDIT_OWN)
  @ApiBearerAuth()
  @Delete(':id/collectors/:userId')
  @ApiOperation({
    summary: 'Remove collector from specimen',
    description: 'Removes a collector association from the specimen. Requires ADMIN or COLLABORATOR role.',
  })
  @ApiParam({ name: 'id', description: 'Specimen UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID to remove' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collector removed successfully',
  })
  async removeCollector(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: UserEntity,
  ) {
    await this.permissionsService.assertCanEditSpecimen(user, id);
    return this.specimensService.removeCollector(id, userId, user.id);
  }
}
