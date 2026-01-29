import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { GendersService } from './genders.service';

@ApiTags('Genders')
@Controller('genders')
export class GendersController {
    constructor(private readonly gendersService: GendersService) { }

    @Public()
    @Get()
    @ApiOperation({
        summary: 'Get all genders',
        description: 'Returns list of all active genders. Public endpoint.',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Genders retrieved successfully',
    })
    async findAll() {
        return this.gendersService.findAll();
    }
}
