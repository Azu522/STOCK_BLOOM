import { IsIn, IsString, Length } from 'class-validator';

export class RecoverPasswordDto {
  @IsString()
  @IsIn(['telefono', 'correo'])
  metodo: 'telefono' | 'correo';

  @IsString()
  @Length(5, 120)
  identificador: string;
}
