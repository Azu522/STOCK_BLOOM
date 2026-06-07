import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';
import { CreateSaleItemDto } from './create-sale-item.dto';

export class CreateSaleDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  id_usuario: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  total: number;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  detalles: CreateSaleItemDto[];
}
