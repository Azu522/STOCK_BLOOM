import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CreateProductionDto } from './dto/create-production.dto';
import { ProductionService } from './production.service';

@Controller('produccion')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Post()
  registrarProduccion(@Body() payload: CreateProductionDto) {
    return this.productionService.registrarProduccion(payload);
  }

  @Put(':id_produccion')
  actualizarProduccion(@Param('id_produccion') idProduccion: string, @Body() payload: CreateProductionDto) {
    return this.productionService.actualizarProduccion(idProduccion, payload);
  }

  @Delete(':id_produccion')
  eliminarProduccion(@Param('id_produccion') idProduccion: string) {
    return this.productionService.eliminarProduccion(idProduccion);
  }

  @Get()
  listarProduccion() {
    return this.productionService.listarProduccion();
  }
}
