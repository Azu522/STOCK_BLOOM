import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateProductionDto } from './dto/create-production.dto';
import { ProductionService } from './production.service';

@Controller('produccion')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Post()
  registrarProduccion(@Body() payload: CreateProductionDto) {
    return this.productionService.registrarProduccion(payload);
  }

  @Get()
  listarProduccion() {
    return this.productionService.listarProduccion();
  }
}
