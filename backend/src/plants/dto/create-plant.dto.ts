import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlantDto {
  @IsString()
  nombre_comun: string;

  @IsOptional()
  @IsString()
  nombre_cientifico?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock: number;

  @IsString()
  ambiente: string;

  @IsString()
  temporada: string;

  @IsString()
  categoria: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio_mayoreo: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio_menudeo: number;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
