import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductionDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  id_planta: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsDateString()
  fecha_siembra: string;

  @IsOptional()
  @IsDateString()
  fecha_cosecha?: string;
}
