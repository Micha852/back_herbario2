import {
  Controller,
  Get,
  Param,
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
import { Public } from '../auth/decorators/public.decorator';

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

}
