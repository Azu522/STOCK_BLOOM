import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SalesService } from './sales.service';

@Controller('ventas')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('empleados/resumen')
  listarVentasPorEmpleado(@Query('inicio') inicio?: string, @Query('fin') fin?: string) {
    return this.salesService.listarVentasPorEmpleado(inicio, fin);
  }

  @Get('empleados/historico')
  buscarVentasHistoricasPorEmpleado(
    @Query('inicio') inicio?: string,
    @Query('fin') fin?: string,
    @Query('q') busqueda?: string,
  ) {
    return this.salesService.buscarVentasHistoricasPorEmpleado(inicio, fin, busqueda);
  }

  @Post()
  registrarVenta(@Body() payload: CreateSaleDto) {
    return this.salesService.registrarVenta(payload);
  }

  @Get()
  listarVentasPorDia(@Query('fecha') fecha?: string) {
    return this.salesService.listarVentasPorDia(fecha);
  }

  @Delete(':id_venta')
  eliminarVenta(@Param('id_venta') idVenta: string) {
    return this.salesService.eliminarVenta(idVenta);
  }
}
