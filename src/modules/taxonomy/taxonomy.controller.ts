import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TaxonomyService } from './taxonomy.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Taxonomy')
@Controller('taxonomy')
export class TaxonomyController {
  constructor(private readonly taxonomyService: TaxonomyService) {}

  // ============ DIVISIONS ============
  @Public()
  @Get('divisions')
  @ApiOperation({
    summary: 'Get all divisions',
    description: 'Returns list of botanical divisions (Magnoliophyta, Pinophyta, etc.)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Divisions retrieved' })
  getDivisions() {
    return this.taxonomyService.getDivisions();
  }

  // ============ CLASSES ============
  @Public()
  @Get('classes')
  @ApiOperation({
    summary: 'Get all classes',
    description: 'Returns list of botanical classes (Magnoliopsida, Liliopsida, etc.)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Classes retrieved' })
  getClasses() {
    return this.taxonomyService.getClasses();
  }

  // ============ ORDERS ============
  @Public()
  @Get('orders')
  @ApiOperation({
    summary: 'Get all orders',
    description: 'Returns list of botanical orders (Fabales, Myrtales, etc.)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Orders retrieved' })
  getOrders() {
    return this.taxonomyService.getOrders();
  }

  // ============ FAMILIES ============
  @Public()
  @Get('families')
  @ApiOperation({
    summary: 'Get all families',
    description: 'Returns list of botanical families (Fabaceae, Myrtaceae, etc.)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Families retrieved' })
  getFamilies() {
    return this.taxonomyService.getFamilies();
  }

  // ============ GENERA ============
  @Public()
  @Get('genera')
  @ApiOperation({
    summary: 'Get all genera',
    description: 'Returns list of botanical genera (Inga, Ficus, Cecropia, etc.)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Genera retrieved' })
  getGenera() {
    return this.taxonomyService.getGenera();
  }

  // ============ SPECIES ============
  @Public()
  @Get('species')
  @ApiOperation({
    summary: 'Get all species',
    description: 'Returns list of species with their epithet, author, and full scientific name',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Species retrieved' })
  getSpecies() {
    return this.taxonomyService.getSpecies();
  }

  // ============ VENATION TYPES ============
  @Public()
  @Get('venation-types')
  @ApiOperation({
    summary: 'Get all venation types',
    description: 'Returns list of leaf venation types (Pinnada, Palmada, Paralela, etc.)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Venation types retrieved' })
  getVenationTypes() {
    return this.taxonomyService.getVenationTypes();
  }

  // ============ FORM TYPES ============
  @Public()
  @Get('form-types')
  @ApiOperation({
    summary: 'Get all form types',
    description: 'Returns list of leaf form types (Lanceolada, Ovada, Elíptica, etc.)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Form types retrieved' })
  getFormTypes() {
    return this.taxonomyService.getFormTypes();
  }

  // ============ MARGIN TYPES ============
  @Public()
  @Get('margin-types')
  @ApiOperation({
    summary: 'Get all margin types',
    description: 'Returns list of leaf margin types (Entero, Aserrado, Dentado, etc.)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Margin types retrieved' })
  getMarginTypes() {
    return this.taxonomyService.getMarginTypes();
  }

}
