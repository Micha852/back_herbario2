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
import { SpecimensService } from './specimens.service';
import { CreateSpecimenDto } from './dto/create-specimen.dto';
import { SearchSpecimenDto } from './dto/search-specimen.dto';

@ApiTags('Specimens')
@Controller('specimens')
export class SpecimensController {
  constructor(private readonly specimensService: SpecimensService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new specimen' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Specimen created' })
  create(@Body() dto: CreateSpecimenDto) {
    return this.specimensService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Search specimens with filters and pagination' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Specimens retrieved' })
  findAll(@Query() searchDto: SearchSpecimenDto) {
    return this.specimensService.findAll(searchDto);
  }

  @Get('reference/origins')
  @ApiOperation({ summary: 'Get all origins' })
  getOrigins() {
    return this.specimensService.getOrigins();
  }

  @Post('reference/origins')
  @ApiOperation({ summary: 'Create a new origin' })
  createOrigin(@Body('name') name: string) {
    return this.specimensService.createOrigin(name);
  }

  @Get('reference/conditions')
  @ApiOperation({ summary: 'Get all conditions' })
  getConditions() {
    return this.specimensService.getConditions();
  }

  @Post('reference/conditions')
  @ApiOperation({ summary: 'Create a new condition' })
  createCondition(@Body('name') name: string) {
    return this.specimensService.createCondition(name);
  }

  @Get('reference/origin-types')
  @ApiOperation({ summary: 'Get all origin types' })
  getOriginTypes() {
    return this.specimensService.getOriginTypes();
  }

  @Post('reference/origin-types')
  @ApiOperation({ summary: 'Create a new origin type' })
  createOriginType(@Body('name') name: string) {
    return this.specimensService.createOriginType(name);
  }

  @Get('reference/habitats')
  @ApiOperation({ summary: 'Get all habitats' })
  getHabitats() {
    return this.specimensService.getHabitats();
  }

  @Post('reference/habitats')
  @ApiOperation({ summary: 'Create a new habitat' })
  createHabitat(@Body('name') name: string) {
    return this.specimensService.createHabitat(name);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specimen by ID with all relations' })
  @ApiParam({ name: 'id', description: 'Specimen UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Specimen retrieved' })
  findOne(@Param('id') id: string) {
    return this.specimensService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a specimen' })
  @ApiParam({ name: 'id', description: 'Specimen UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Specimen updated' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateSpecimenDto>) {
    return this.specimensService.update(id, dto);
  }

  @Patch(':id/image')
  @ApiOperation({ summary: 'Update specimen image' })
  @ApiParam({ name: 'id', description: 'Specimen UUID' })
  updateImage(@Param('id') id: string, @Body('imageId') imageId: string) {
    return this.specimensService.updateImage(id, imageId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a specimen (soft delete)' })
  @ApiParam({ name: 'id', description: 'Specimen UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Specimen deleted' })
  remove(@Param('id') id: string) {
    return this.specimensService.remove(id);
  }

  @Get(':id/collectors')
  @ApiOperation({ summary: 'Get collectors for a specimen' })
  @ApiParam({ name: 'id', description: 'Specimen UUID' })
  getCollectors(@Param('id') id: string) {
    return this.specimensService.getCollectors(id);
  }

  @Post(':id/collectors/:userId')
  @ApiOperation({ summary: 'Add a collector to a specimen' })
  @ApiParam({ name: 'id', description: 'Specimen UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  addCollector(@Param('id') id: string, @Param('userId') userId: string) {
    return this.specimensService.addCollector(id, userId);
  }

  @Delete(':id/collectors/:userId')
  @ApiOperation({ summary: 'Remove a collector from a specimen' })
  @ApiParam({ name: 'id', description: 'Specimen UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  removeCollector(@Param('id') id: string, @Param('userId') userId: string) {
    return this.specimensService.removeCollector(id, userId);
  }
}
