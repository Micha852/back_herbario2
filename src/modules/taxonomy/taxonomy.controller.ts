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
import { TaxonomyService } from './taxonomy.service';
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto';
import { TaxonomyType } from './enums/taxonomy-type.enum';

@ApiTags('Taxonomy')
@Controller('taxonomy')
export class TaxonomyController {
  constructor(private readonly taxonomyService: TaxonomyService) {}

  // ============ CLASSES ============
  @Get('classes')
  @ApiOperation({ summary: 'Get all classes' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Classes retrieved' })
  getClasses() {
    return this.taxonomyService.getClasses();
  }

  @Post('classes')
  @ApiOperation({ summary: 'Create a new class' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Class created' })
  createClass(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomyService.create(TaxonomyType.CLASS, dto);
  }

  @Patch('classes/:id')
  @ApiOperation({ summary: 'Update a class' })
  @ApiParam({ name: 'id', description: 'Class UUID' })
  updateClass(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomyService.update(TaxonomyType.CLASS, id, dto);
  }

  @Delete('classes/:id')
  @ApiOperation({ summary: 'Delete a class' })
  @ApiParam({ name: 'id', description: 'Class UUID' })
  removeClass(@Param('id') id: string) {
    return this.taxonomyService.remove(TaxonomyType.CLASS, id);
  }

  // ============ ORDERS ============
  @Get('orders')
  @ApiOperation({ summary: 'Get all orders' })
  getOrders() {
    return this.taxonomyService.getOrders();
  }

  @Post('orders')
  @ApiOperation({ summary: 'Create a new order' })
  createOrder(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomyService.create(TaxonomyType.ORDER, dto);
  }

  @Patch('orders/:id')
  @ApiOperation({ summary: 'Update an order' })
  updateOrder(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomyService.update(TaxonomyType.ORDER, id, dto);
  }

  @Delete('orders/:id')
  @ApiOperation({ summary: 'Delete an order' })
  removeOrder(@Param('id') id: string) {
    return this.taxonomyService.remove(TaxonomyType.ORDER, id);
  }

  // ============ FAMILIES ============
  @Get('families')
  @ApiOperation({ summary: 'Get all families' })
  getFamilies() {
    return this.taxonomyService.getFamilies();
  }

  @Post('families')
  @ApiOperation({ summary: 'Create a new family' })
  createFamily(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomyService.create(TaxonomyType.FAMILY, dto);
  }

  @Patch('families/:id')
  @ApiOperation({ summary: 'Update a family' })
  updateFamily(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomyService.update(TaxonomyType.FAMILY, id, dto);
  }

  @Delete('families/:id')
  @ApiOperation({ summary: 'Delete a family' })
  removeFamily(@Param('id') id: string) {
    return this.taxonomyService.remove(TaxonomyType.FAMILY, id);
  }

  // ============ GENERA ============
  @Get('genera')
  @ApiOperation({ summary: 'Get all genera' })
  getGenera() {
    return this.taxonomyService.getGenera();
  }

  @Post('genera')
  @ApiOperation({ summary: 'Create a new genus' })
  createGenus(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomyService.create(TaxonomyType.GENUS, dto);
  }

  @Patch('genera/:id')
  @ApiOperation({ summary: 'Update a genus' })
  updateGenus(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomyService.update(TaxonomyType.GENUS, id, dto);
  }

  @Delete('genera/:id')
  @ApiOperation({ summary: 'Delete a genus' })
  removeGenus(@Param('id') id: string) {
    return this.taxonomyService.remove(TaxonomyType.GENUS, id);
  }

  // ============ SPECIES ============
  @Get('species')
  @ApiOperation({ summary: 'Get all species' })
  getSpecies() {
    return this.taxonomyService.getSpecies();
  }

  @Post('species')
  @ApiOperation({ summary: 'Create a new species' })
  createSpecies(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomyService.create(TaxonomyType.SPECIES, dto);
  }

  @Patch('species/:id')
  @ApiOperation({ summary: 'Update a species' })
  updateSpecies(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomyService.update(TaxonomyType.SPECIES, id, dto);
  }

  @Delete('species/:id')
  @ApiOperation({ summary: 'Delete a species' })
  removeSpecies(@Param('id') id: string) {
    return this.taxonomyService.remove(TaxonomyType.SPECIES, id);
  }

  // ============ DIVISIONS ============
  @Get('divisions')
  @ApiOperation({ summary: 'Get all divisions' })
  getDivisions() {
    return this.taxonomyService.getDivisions();
  }

  @Post('divisions')
  @ApiOperation({ summary: 'Create a new division' })
  createDivision(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomyService.create(TaxonomyType.DIVISION, dto);
  }

  @Patch('divisions/:id')
  @ApiOperation({ summary: 'Update a division' })
  updateDivision(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomyService.update(TaxonomyType.DIVISION, id, dto);
  }

  @Delete('divisions/:id')
  @ApiOperation({ summary: 'Delete a division' })
  removeDivision(@Param('id') id: string) {
    return this.taxonomyService.remove(TaxonomyType.DIVISION, id);
  }

  // ============ VENATION TYPES ============
  @Get('venation-types')
  @ApiOperation({ summary: 'Get all venation types' })
  getVenationTypes() {
    return this.taxonomyService.getVenationTypes();
  }

  @Post('venation-types')
  @ApiOperation({ summary: 'Create a new venation type' })
  createVenationType(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomyService.create(TaxonomyType.VENATION_TYPE, dto);
  }

  @Patch('venation-types/:id')
  @ApiOperation({ summary: 'Update a venation type' })
  updateVenationType(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomyService.update(TaxonomyType.VENATION_TYPE, id, dto);
  }

  @Delete('venation-types/:id')
  @ApiOperation({ summary: 'Delete a venation type' })
  removeVenationType(@Param('id') id: string) {
    return this.taxonomyService.remove(TaxonomyType.VENATION_TYPE, id);
  }

  // ============ FORM TYPES ============
  @Get('form-types')
  @ApiOperation({ summary: 'Get all form types' })
  getFormTypes() {
    return this.taxonomyService.getFormTypes();
  }

  @Post('form-types')
  @ApiOperation({ summary: 'Create a new form type' })
  createFormType(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomyService.create(TaxonomyType.FORM_TYPE, dto);
  }

  @Patch('form-types/:id')
  @ApiOperation({ summary: 'Update a form type' })
  updateFormType(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomyService.update(TaxonomyType.FORM_TYPE, id, dto);
  }

  @Delete('form-types/:id')
  @ApiOperation({ summary: 'Delete a form type' })
  removeFormType(@Param('id') id: string) {
    return this.taxonomyService.remove(TaxonomyType.FORM_TYPE, id);
  }

  // ============ MARGIN TYPES ============
  @Get('margin-types')
  @ApiOperation({ summary: 'Get all margin types' })
  getMarginTypes() {
    return this.taxonomyService.getMarginTypes();
  }

  @Post('margin-types')
  @ApiOperation({ summary: 'Create a new margin type' })
  createMarginType(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomyService.create(TaxonomyType.MARGIN_TYPE, dto);
  }

  @Patch('margin-types/:id')
  @ApiOperation({ summary: 'Update a margin type' })
  updateMarginType(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomyService.update(TaxonomyType.MARGIN_TYPE, id, dto);
  }

  @Delete('margin-types/:id')
  @ApiOperation({ summary: 'Delete a margin type' })
  removeMarginType(@Param('id') id: string) {
    return this.taxonomyService.remove(TaxonomyType.MARGIN_TYPE, id);
  }
}
