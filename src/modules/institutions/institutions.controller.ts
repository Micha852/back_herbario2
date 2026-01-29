import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { InstitutionsService } from './institutions.service';

@ApiTags('Institutions')
@Controller('institutions')
export class InstitutionsController {
    constructor(private readonly institutionsService: InstitutionsService) { }

    @Public()
    @Get()
    @ApiOperation({
        summary: 'Get all institutions',
        description: 'Returns list of all active institutions. Public endpoint.',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Institutions retrieved successfully',
    })
    async findAll() {
        return this.institutionsService.findAll();
    }
}
