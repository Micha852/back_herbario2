import {
  Controller,
  Get,
  Param,
  Query,
  Res,
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
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/require-permissions.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Public()
  @Get('statistics')
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description: 'Returns count of specimens, families, genera, species, and collectors. Public endpoint.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  getStatistics() {
    return this.reportsService.getStatistics();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.REPORTS_GENERATE)
  @ApiBearerAuth()
  @Get('collector/:id')
  @ApiOperation({
    summary: 'Get specimens by collector',
    description: 'Returns specimens collected by a specific user. Requires ADMIN or COLLABORATOR role.',
  })
  @ApiParam({ name: 'id', description: 'Collector UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collector report retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Collector not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  getSpecimensByCollector(@Param('id') id: string) {
    return this.reportsService.getSpecimensByCollector(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.REPORTS_GENERATE)
  @ApiBearerAuth()
  @Get('darwin-core')
  @ApiOperation({
    summary: 'Get Darwin Core format data',
    description: 'Returns specimen data in Darwin Core standard format for biodiversity data exchange. Public endpoint.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter from date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter to date (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Darwin Core data retrieved successfully',
  })
  getDarwinCore(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getDarwinCoreData(startDate, endDate);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.REPORTS_GENERATE)
  @ApiBearerAuth()
  @Get('darwin-core/csv')
  @ApiOperation({
    summary: 'Download Darwin Core data as CSV',
    description: 'Downloads specimen data as CSV file in Darwin Core format. Public endpoint.',
  })
  @ApiProduces('text/csv')
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter from date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter to date (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CSV file downloaded successfully',
  })
  async downloadDarwinCoreCSV(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    const data = await this.reportsService.getDarwinCoreData(startDate, endDate);

    if (data.length === 0) {
      res.status(200).send('No data found');
      return;
    }

    // Create CSV
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((row) =>
      Object.values(row)
        .map((val) => `"${val || ''}"`)
        .join(','),
    );
    const csv = [headers, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="darwin-core-${new Date().toISOString().split('T')[0]}.csv"`,
    );
    res.send(csv);
  }
}
