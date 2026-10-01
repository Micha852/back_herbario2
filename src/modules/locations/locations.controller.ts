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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateMunicipalityDto } from './dto/create-municipality.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/require-permissions.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';

@ApiTags('Locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  // ============ DEPARTMENTS ============
  @Public()
  @Get('departments')
  @ApiOperation({
    summary: 'Get all departments',
    description: 'Returns list of all Colombian departments. Public endpoint.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Departments retrieved successfully',
  })
  getDepartments() {
    return this.locationsService.findAllDepartments();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Post('departments')
  @ApiOperation({
    summary: 'Create a new department',
    description: 'Creates a new department. Requires ADMIN role.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Department created successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Department name already exists',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.locationsService.createDepartment(dto);
  }

  @Public()
  @Get('departments/:id')
  @ApiOperation({
    summary: 'Get department by ID with municipalities',
    description: 'Returns department details with its municipalities. Public endpoint.',
  })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Department not found',
  })
  getDepartment(@Param('id') id: string) {
    return this.locationsService.findDepartmentById(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Patch('departments/:id')
  @ApiOperation({
    summary: 'Update a department',
    description: 'Updates department information. Requires ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Department not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  updateDepartment(
    @Param('id') id: string,
    @Body() dto: Partial<CreateDepartmentDto>,
  ) {
    return this.locationsService.updateDepartment(id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_DELETE)
  @ApiBearerAuth()
  @Delete('departments/:id')
  @ApiOperation({
    summary: 'Delete a department',
    description: 'Soft deletes a department. Requires ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Department not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  removeDepartment(@Param('id') id: string) {
    return this.locationsService.removeDepartment(id);
  }

  // ============ MUNICIPALITIES ============
  @Public()
  @Get('municipalities')
  @ApiOperation({
    summary: 'Get all municipalities',
    description: 'Returns list of municipalities, optionally filtered by department. Public endpoint.',
  })
  @ApiQuery({
    name: 'departmentId',
    required: false,
    description: 'Filter by department UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Municipalities retrieved successfully',
  })
  getMunicipalities(@Query('departmentId') departmentId?: string) {
    return this.locationsService.findAllMunicipalities(departmentId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Post('municipalities')
  @ApiOperation({
    summary: 'Create a new municipality',
    description: 'Creates a new municipality within a department. Requires ADMIN role.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Municipality created successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Municipality name already exists in this department',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  createMunicipality(@Body() dto: CreateMunicipalityDto) {
    return this.locationsService.createMunicipality(dto);
  }

  @Public()
  @Get('municipalities/:id')
  @ApiOperation({
    summary: 'Get municipality by ID',
    description: 'Returns municipality details with its department. Public endpoint.',
  })
  @ApiParam({ name: 'id', description: 'Municipality UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Municipality retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Municipality not found',
  })
  getMunicipality(@Param('id') id: string) {
    return this.locationsService.findMunicipalityById(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Patch('municipalities/:id')
  @ApiOperation({
    summary: 'Update a municipality',
    description: 'Updates municipality information. Requires ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Municipality UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Municipality updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Municipality not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  updateMunicipality(
    @Param('id') id: string,
    @Body() dto: Partial<CreateMunicipalityDto>,
  ) {
    return this.locationsService.updateMunicipality(id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_DELETE)
  @ApiBearerAuth()
  @Delete('municipalities/:id')
  @ApiOperation({
    summary: 'Delete a municipality',
    description: 'Soft deletes a municipality. Requires ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Municipality UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Municipality deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Municipality not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  removeMunicipality(@Param('id') id: string) {
    return this.locationsService.removeMunicipality(id);
  }

  // ============ LOCATION TYPES ============
  @Public()
  @Get('types')
  @ApiOperation({
    summary: 'Get all location types',
    description: 'Returns list of location types (Finca, Reserva, Parque, etc.). Public endpoint.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location types retrieved successfully',
  })
  getLocationTypes() {
    return this.locationsService.findAllLocationTypes();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Post('types')
  @ApiOperation({
    summary: 'Create a new location type',
    description: 'Creates a new location type. Requires ADMIN role.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Location type created successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Location type name already exists',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  createLocationType(@Body('name') name: string) {
    return this.locationsService.createLocationType(name);
  }

  // ============ LOCATIONS ============
  @Public()
  @Get()
  @ApiOperation({
    summary: 'Get all locations',
    description: 'Returns list of specific collection locations, optionally filtered. Public endpoint.',
  })
  @ApiQuery({
    name: 'municipalityId',
    required: false,
    description: 'Filter by municipality UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Locations retrieved successfully',
  })
  getLocations(@Query('municipalityId') municipalityId?: string) {
    return this.locationsService.findAllLocations(municipalityId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({
    summary: 'Create a new location',
    description: 'Creates a new specific collection location. Requires ADMIN or COLLABORATOR role.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Location created successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  createLocation(@Body() dto: CreateLocationDto) {
    return this.locationsService.createLocation(dto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Get location by ID',
    description: 'Returns location details with municipality and department. Public endpoint.',
  })
  @ApiParam({ name: 'id', description: 'Location UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Location not found',
  })
  getLocation(@Param('id') id: string) {
    return this.locationsService.findLocationById(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a location',
    description: 'Updates location information. Requires ADMIN or COLLABORATOR role.',
  })
  @ApiParam({ name: 'id', description: 'Location UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Location not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  updateLocation(
    @Param('id') id: string,
    @Body() dto: Partial<CreateLocationDto>,
  ) {
    return this.locationsService.updateLocation(id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_DELETE)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a location',
    description: 'Soft deletes a location. Requires ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Location UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Location not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  removeLocation(@Param('id') id: string) {
    return this.locationsService.removeLocation(id);
  }
}
