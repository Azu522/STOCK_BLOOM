import { IsIn, IsObject, IsOptional, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Length(2, 80)
  nombre: string;

  @IsString()
  @Length(2, 80)
  apellidoP: string;

  @IsOptional()
  @IsString()
  @Length(0, 80)
  apellidoM?: string;

  @IsString()
  @Length(7, 20)
  telefono: string;

  @IsString()
  @Length(4, 100)
  contrasenia: string;

  @IsString()
  @IsIn(['Administrador', 'Empleado'])
  rol: string;

  @IsOptional()
  @IsObject()
  privilegios?: Record<string, boolean>;
}
