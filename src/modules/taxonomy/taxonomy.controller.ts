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
import { TaxonomyService } from './taxonomy.service';
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto';
import { TaxonomyType } from './enums/taxonomy-type.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/require-permissions.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';

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

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Post('divisions')
  @ApiOperation({
    summary: 'Create a new division',
    description: 'Creates a new botanical division. Requires ADMIN role.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Division created' })
  createDivision(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomyService.create(TaxonomyType.DIVISION, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Patch('divisions/:id')
  @ApiOperation({ summary: 'Update a division' })
  @ApiParam({ name: 'id', description: 'Division UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Division updated' })
  updateDivision(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomyService.update(TaxonomyType.DIVISION, id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_DELETE)
  @ApiBearerAuth()
  @Delete('divisions/:id')
  @ApiOperation({ summary: 'Delete a division' })
  @ApiParam({ name: 'id', description: 'Division UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Division deleted' })
  removeDivision(@Param('id') id: string) {
    return this.taxonomyService.remove(TaxonomyType.DIVISION, id);
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

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Post('classes')
  @ApiOperation({
    summary: 'Create a new class',
    description: 'Creates a new botanical class linked to a division. Requires ADMIN role.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Class created' })
  createClass(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomyService.create(TaxonomyType.CLASS, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Patch('classes/:id')
  @ApiOperation({ summary: 'Update a class' })
  @ApiParam({ name: 'id', description: 'Class UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Class updated' })
  updateClass(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomyService.update(TaxonomyType.CLASS, id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_DELETE)
  @ApiBearerAuth()
  @Delete('classes/:id')
  @ApiOperation({ summary: 'Delete a class' })
  @ApiParam({ name: 'id', description: 'Class UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Class deleted' })
  removeClass(@Param('id') id: string) {
    return this.taxonomyService.remove(TaxonomyType.CLASS, id);
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

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Post('orders')
  @ApiOperation({
    summary: 'Create a new order',
    description: 'Creates a new botanical order linked to a class. Requires ADMIN role.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Order created' })
  createOrder(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomyService.create(TaxonomyType.ORDER, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Patch('orders/:id')
  @ApiOperation({ summary: 'Update an order' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Order updated' })
  updateOrder(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomyService.update(TaxonomyType.ORDER, id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_DELETE)
  @ApiBearerAuth()
  @Delete('orders/:id')
  @ApiOperation({ summary: 'Delete an order' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Order deleted' })
  removeOrder(@Param('id') id: string) {
    return this.taxonomyService.remove(TaxonomyType.ORDER, id);
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

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Post('families')
  @ApiOperation({
    summary: 'Create a new family',
    description: 'Creates a new botanical family linked to an order. Requires ADMIN role.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Family created' })
  createFamily(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomyService.create(TaxonomyType.FAMILY, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Patch('families/:id')
  @ApiOperation({ summary: 'Update a family' })
  @ApiParam({ name: 'id', description: 'Family UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Family updated' })
  updateFamily(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomyService.update(TaxonomyType.FAMILY, id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_DELETE)
  @ApiBearerAuth()
  @Delete('families/:id')
  @ApiOperation({ summary: 'Delete a family' })
  @ApiParam({ name: 'id', description: 'Family UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Family deleted' })
  removeFamily(@Param('id') id: string) {
    return this.taxonomyService.remove(TaxonomyType.FAMILY, id);
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

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Post('genera')
  @ApiOperation({
    summary: 'Create a new genus',
    description: 'Creates a new botanical genus linked to a family. Requires ADMIN role.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Genus created' })
  createGenus(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomyService.create(TaxonomyType.GENUS, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Patch('genera/:id')
  @ApiOperation({ summary: 'Update a genus' })
  @ApiParam({ name: 'id', description: 'Genus UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Genus updated' })
  updateGenus(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomyService.update(TaxonomyType.GENUS, id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_DELETE)
  @ApiBearerAuth()
  @Delete('genera/:id')
  @ApiOperation({ summary: 'Delete a genus' })
  @ApiParam({ name: 'id', description: 'Genus UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Genus deleted' })
  removeGenus(@Param('id') id: string) {
    return this.taxonomyService.remove(TaxonomyType.GENUS, id);
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

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Post('species')
  @ApiOperation({
    summary: 'Create a new species',
    description: 'Creates a new species linked to a genus. Requires ADMIN role.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Species created' })
  createSpecies(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomyService.create(TaxonomyType.SPECIES, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Patch('species/:id')
  @ApiOperation({ summary: 'Update a species' })
  @ApiParam({ name: 'id', description: 'Species UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Species updated' })
  updateSpecies(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomyService.update(TaxonomyType.SPECIES, id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_DELETE)
  @ApiBearerAuth()
  @Delete('species/:id')
  @ApiOperation({ summary: 'Delete a species' })
  @ApiParam({ name: 'id', description: 'Species UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Species deleted' })
  removeSpecies(@Param('id') id: string) {
    return this.taxonomyService.remove(TaxonomyType.SPECIES, id);
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

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Post('venation-types')
  @ApiOperation({ summary: 'Create a new venation type' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Venation type created' })
  createVenationType(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomyService.create(TaxonomyType.VENATION_TYPE, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Patch('venation-types/:id')
  @ApiOperation({ summary: 'Update a venation type' })
  @ApiParam({ name: 'id', description: 'Venation type UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Venation type updated' })
  updateVenationType(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomyService.update(TaxonomyType.VENATION_TYPE, id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_DELETE)
  @ApiBearerAuth()
  @Delete('venation-types/:id')
  @ApiOperation({ summary: 'Delete a venation type' })
  @ApiParam({ name: 'id', description: 'Venation type UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Venation type deleted' })
  removeVenationType(@Param('id') id: string) {
    return this.taxonomyService.remove(TaxonomyType.VENATION_TYPE, id);
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

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Post('form-types')
  @ApiOperation({ summary: 'Create a new form type' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Form type created' })
  createFormType(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomyService.create(TaxonomyType.FORM_TYPE, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Patch('form-types/:id')
  @ApiOperation({ summary: 'Update a form type' })
  @ApiParam({ name: 'id', description: 'Form type UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Form type updated' })
  updateFormType(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomyService.update(TaxonomyType.FORM_TYPE, id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_DELETE)
  @ApiBearerAuth()
  @Delete('form-types/:id')
  @ApiOperation({ summary: 'Delete a form type' })
  @ApiParam({ name: 'id', description: 'Form type UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Form type deleted' })
  removeFormType(@Param('id') id: string) {
    return this.taxonomyService.remove(TaxonomyType.FORM_TYPE, id);
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

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Post('margin-types')
  @ApiOperation({ summary: 'Create a new margin type' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Margin type created' })
  createMarginType(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomyService.create(TaxonomyType.MARGIN_TYPE, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @ApiBearerAuth()
  @Patch('margin-types/:id')
  @ApiOperation({ summary: 'Update a margin type' })
  @ApiParam({ name: 'id', description: 'Margin type UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Margin type updated' })
  updateMarginType(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomyService.update(TaxonomyType.MARGIN_TYPE, id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_DELETE)
  @ApiBearerAuth()
  @Delete('margin-types/:id')
  @ApiOperation({ summary: 'Delete a margin type' })
  @ApiParam({ name: 'id', description: 'Margin type UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Margin type deleted' })
  removeMarginType(@Param('id') id: string) {
    return this.taxonomyService.remove(TaxonomyType.MARGIN_TYPE, id);
  }
}
