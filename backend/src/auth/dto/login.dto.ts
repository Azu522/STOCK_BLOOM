import { IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(7, 20)
  telefono: string;

  @IsString()
  @Length(4, 100)
  contrasenia: string;
}
