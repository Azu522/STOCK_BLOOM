import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() payload: LoginDto) {
    const response = await this.authService.login(payload);
    if (!response.success) {
      throw new UnauthorizedException(response);
    }
    return response;
  }

  @Get('usuarios')
  listarUsuarios() {
    return this.authService.listarUsuarios();
  }

  @Get('usuarios/buscar')
  async buscarUsuario(@Query('telefono') telefono: string) {
    const usuario = await this.authService.buscarUsuario(telefono);
    if (!usuario) {
      throw new NotFoundException({ error: 'Empleado no encontrado' });
    }
    return usuario;
  }

  @Post('usuarios')
  registrarUsuario(@Body() payload: CreateUserDto) {
    return this.authService.registrarUsuario(payload);
  }

  @Put('usuarios/:id_usuario')
  actualizarUsuario(@Param('id_usuario') idUsuario: string, @Body() payload: UpdateUserDto) {
    return this.authService.actualizarUsuario(idUsuario, payload);
  }

  @Delete('usuarios/:id_usuario')
  eliminarUsuario(@Param('id_usuario') idUsuario: string) {
    return this.authService.eliminarUsuario(idUsuario);
  }
}
