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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateMunicipalityDto } from './dto/create-municipality.dto';
import { CreateLocationDto } from './dto/create-location.dto';

@ApiTags('Locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  // ============ DEPARTMENTS ============
  @Get('departments')
  @ApiOperation({ summary: 'Get all departments' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Departments retrieved' })
  getDepartments() {
    return this.locationsService.findAllDepartments();
  }

  @Post('departments')
  @ApiOperation({ summary: 'Create a new department' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Department created' })
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.locationsService.createDepartment(dto);
  }

  @Get('departments/:id')
  @ApiOperation({ summary: 'Get department by ID with municipalities' })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  getDepartment(@Param('id') id: string) {
    return this.locationsService.findDepartmentById(id);
  }

  @Patch('departments/:id')
  @ApiOperation({ summary: 'Update a department' })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  updateDepartment(
    @Param('id') id: string,
    @Body() dto: Partial<CreateDepartmentDto>,
  ) {
    return this.locationsService.updateDepartment(id, dto);
  }

  @Delete('departments/:id')
  @ApiOperation({ summary: 'Delete a department' })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  removeDepartment(@Param('id') id: string) {
    return this.locationsService.removeDepartment(id);
  }

  // ============ MUNICIPALITIES ============
  @Get('municipalities')
  @ApiOperation({ summary: 'Get all municipalities' })
  @ApiQuery({
    name: 'departmentId',
    required: false,
    description: 'Filter by department ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Municipalities retrieved',
  })
  getMunicipalities(@Query('departmentId') departmentId?: string) {
    return this.locationsService.findAllMunicipalities(departmentId);
  }

  @Post('municipalities')
  @ApiOperation({ summary: 'Create a new municipality' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Municipality created',
  })
  createMunicipality(@Body() dto: CreateMunicipalityDto) {
    return this.locationsService.createMunicipality(dto);
  }

  @Get('municipalities/:id')
  @ApiOperation({ summary: 'Get municipality by ID' })
  @ApiParam({ name: 'id', description: 'Municipality UUID' })
  getMunicipality(@Param('id') id: string) {
    return this.locationsService.findMunicipalityById(id);
  }

  @Patch('municipalities/:id')
  @ApiOperation({ summary: 'Update a municipality' })
  @ApiParam({ name: 'id', description: 'Municipality UUID' })
  updateMunicipality(
    @Param('id') id: string,
    @Body() dto: Partial<CreateMunicipalityDto>,
  ) {
    return this.locationsService.updateMunicipality(id, dto);
  }

  @Delete('municipalities/:id')
  @ApiOperation({ summary: 'Delete a municipality' })
  @ApiParam({ name: 'id', description: 'Municipality UUID' })
  removeMunicipality(@Param('id') id: string) {
    return this.locationsService.removeMunicipality(id);
  }

  // ============ LOCATION TYPES ============
  @Get('types')
  @ApiOperation({ summary: 'Get all location types' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Location types retrieved' })
  getLocationTypes() {
    return this.locationsService.findAllLocationTypes();
  }

  @Post('types')
  @ApiOperation({ summary: 'Create a new location type' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Location type created' })
  createLocationType(@Body('name') name: string) {
    return this.locationsService.createLocationType(name);
  }

  // ============ LOCATIONS ============
  @Get()
  @ApiOperation({ summary: 'Get all locations' })
  @ApiQuery({
    name: 'municipalityId',
    required: false,
    description: 'Filter by municipality ID',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Locations retrieved' })
  getLocations(@Query('municipalityId') municipalityId?: string) {
    return this.locationsService.findAllLocations(municipalityId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new location' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Location created' })
  createLocation(@Body() dto: CreateLocationDto) {
    return this.locationsService.createLocation(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get location by ID' })
  @ApiParam({ name: 'id', description: 'Location UUID' })
  getLocation(@Param('id') id: string) {
    return this.locationsService.findLocationById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a location' })
  @ApiParam({ name: 'id', description: 'Location UUID' })
  updateLocation(
    @Param('id') id: string,
    @Body() dto: Partial<CreateLocationDto>,
  ) {
    return this.locationsService.updateLocation(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a location' })
  @ApiParam({ name: 'id', description: 'Location UUID' })
  removeLocation(@Param('id') id: string) {
    return this.locationsService.removeLocation(id);
  }
}
