import { IsEmail, IsIn, IsObject, IsOptional, IsString, Length, ValidateIf } from 'class-validator';

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

  @ValidateIf((payload) => payload.correo !== undefined && payload.correo !== '')
  @IsEmail()
  @Length(5, 120)
  correo?: string;

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
