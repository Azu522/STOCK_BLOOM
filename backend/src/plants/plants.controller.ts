import { Body, Controller, Delete, HttpException, Param, Post, Put, Get } from '@nestjs/common';
import { CreatePlantDto } from './dto/create-plant.dto';
import { PlantsService } from './plants.service';

@Controller('planta')
export class PlantsController {
  constructor(private readonly plantsService: PlantsService) {}

  @Get()
  listarPlantas() {
    return this.plantsService.listarPlantas();
  }

  @Post()
  registrarPlanta(@Body() payload: CreatePlantDto) {
    return this.plantsService.registrarPlanta(payload);
  }

  @Put(':id_planta')
  actualizarPlanta(@Param('id_planta') idPlanta: string, @Body() payload: CreatePlantDto) {
    return this.plantsService.actualizarPlanta(idPlanta, payload);
  }

  @Delete(':id_planta')
  async eliminarPlanta(@Param('id_planta') idPlanta: string) {
    const response = await this.plantsService.eliminarPlanta(idPlanta);
    if (!response.success && response.statusCode) {
      throw new HttpException(response, response.statusCode);
    }
    return response;
  }
}
