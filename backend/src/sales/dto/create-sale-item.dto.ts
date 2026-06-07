import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSaleItemDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  id_planta: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  cantidad: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio_unitario: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  subtotal: number;
}
