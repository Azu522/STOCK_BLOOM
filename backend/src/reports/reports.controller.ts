import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reportes')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':tipo')
  descargarReporte(@Param('tipo') tipo: string, @Query() filtros: Record<string, string>, @Res() res: any) {
    return this.reportsService.descargarReporte(tipo, filtros, res);
  }
}
