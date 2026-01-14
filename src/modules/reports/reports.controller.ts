import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('statistics')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Statistics retrieved' })
  getStatistics() {
    return this.reportsService.getStatistics();
  }

  @Get('collector/:id')
  @ApiOperation({ summary: 'Get specimens by collector' })
  @ApiParam({ name: 'id', description: 'Collector UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Report data retrieved' })
  getSpecimensByCollector(@Param('id') id: string) {
    return this.reportsService.getSpecimensByCollector(id);
  }

  @Get('darwin-core')
  @ApiOperation({ summary: 'Get Darwin Core format data' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Darwin Core data retrieved' })
  getDarwinCore(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getDarwinCoreData(startDate, endDate);
  }

  @Get('darwin-core/csv')
  @ApiOperation({ summary: 'Download Darwin Core data as CSV' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
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
