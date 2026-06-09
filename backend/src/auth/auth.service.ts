import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const privilegiosBase = {
  ver_inventario: false,
  registrar_modificar: false,
  control_produccion: false,
  punto_venta: false,
  historial_contable: false,
  administrar_usuarios: false,
};

const privilegiosAdmin = {
  ver_inventario: true,
  registrar_modificar: true,
  control_produccion: true,
  punto_venta: true,
  historial_contable: true,
  administrar_usuarios: true,
};

const permisosPorPrivilegio = {
  ver_inventario: ['VER_PRODUCTOS'],
  registrar_modificar: ['GESTIONAR_PRODUCTOS'],
  control_produccion: ['GESTIONAR_PRODUCTOS'],
  punto_venta: ['REGISTRAR_VENTA'],
  historial_contable: ['VER_HISTORIAL_VENTAS', 'REALIZAR_CORTE'],
  administrar_usuarios: ['GESTIONAR_USUARIOS'],
};

@Injectable()
export class AuthService {
  private passwordColumnName: string | null = null;
  private activeColumnChecked = false;
  private emailColumnChecked = false;

  constructor(private readonly db: DatabaseService) {}

  private escapeIdentifier(identifier: string) {
    return this.db.escapeIdentifier(identifier);
  }

  private async getPasswordColumn() {
    if (this.passwordColumnName) return this.passwordColumnName;

    const [columns] = await this.db.query('SHOW COLUMNS FROM usuario');
    const fields = columns.map((column) => String(column.Field));
    const passwordColumn = fields.find((field) => {
      const normalized = field.toLowerCase();
      return normalized.includes('contrase') || normalized === 'password';
    });

    if (!passwordColumn) {
      throw new Error('No se encontro una columna de contrasena en la tabla usuario.');
    }

    this.passwordColumnName = passwordColumn;
    return passwordColumn;
  }

  private async ensureActiveColumn() {
    if (this.activeColumnChecked) return;

    const [columns] = await this.db.query('SHOW COLUMNS FROM usuario');
    const hasActiveColumn = columns.some((column) => String(column.Field).toLowerCase() === 'activo');

    if (!hasActiveColumn) {
      await this.db.query(
        this.db.isPostgres()
          ? 'ALTER TABLE usuario ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE'
          : 'ALTER TABLE usuario ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1',
      );
    }

    this.activeColumnChecked = true;
  }

  private async ensureEmailColumn() {
    if (this.emailColumnChecked) return;

    const [columns] = await this.db.query('SHOW COLUMNS FROM usuario');
    const hasEmailColumn = columns.some((column) => String(column.Field).toLowerCase() === 'correo');

    if (!hasEmailColumn) {
      await this.db.query('ALTER TABLE usuario ADD COLUMN correo VARCHAR(120)');
    }

    this.emailColumnChecked = true;
  }

  private generarContrasenaTemporal() {
    return `SB-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  private isBcryptHash(value: string) {
    return /^\$2[aby]\$\d{2}\$/.test(value || '');
  }

  private hashPassword(password: string) {
    return bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 12));
  }

  private async passwordMatches(password: string, storedPassword: string) {
    if (!storedPassword) return false;

    if (this.isBcryptHash(storedPassword)) {
      return bcrypt.compare(password, storedPassword);
    }

    return password === storedPassword;
  }

  private permisosAPrivilegios(nombresPermiso: string[], rol?: string) {
    if (rol === 'Administrador') return { ...privilegiosAdmin };

    const permisos = new Set(nombresPermiso || []);
    return {
      ...privilegiosBase,
      ver_inventario: permisos.has('VER_PRODUCTOS') || permisos.has('GESTIONAR_PRODUCTOS'),
      registrar_modificar: permisos.has('GESTIONAR_PRODUCTOS'),
      control_produccion: permisos.has('GESTIONAR_PRODUCTOS'),
      punto_venta: permisos.has('REGISTRAR_VENTA'),
      historial_contable: permisos.has('VER_HISTORIAL_VENTAS') || permisos.has('REALIZAR_CORTE'),
      administrar_usuarios: permisos.has('GESTIONAR_USUARIOS'),
    };
  }

  private privilegiosAPermisos(privilegios: Record<string, boolean>, rol?: string) {
    if (rol === 'Administrador') {
      return Object.values(permisosPorPrivilegio).flat();
    }

    const permisos = new Set<string>();
    Object.entries(privilegios || {}).forEach(([privilegio, activo]) => {
      if (!activo) return;
      (permisosPorPrivilegio[privilegio] || []).forEach((permiso) => permisos.add(permiso));
    });
    return Array.from(permisos);
  }

  private async obtenerNombresPermiso(idUsuario: number) {
    const [rows] = await this.db.query(
      `SELECT p.nombre_permiso
       FROM usuario_permiso up
       INNER JOIN permiso p ON up.id_permiso = p.id_permiso
       WHERE up.id_usuario = ?`,
      [idUsuario],
    );

    return rows.map((row) => row.nombre_permiso);
  }

  private async sincronizarPermisos(idUsuario: number, privilegios: Record<string, boolean>, rol?: string) {
    const nombresPermiso = this.privilegiosAPermisos(privilegios, rol);
    await this.db.query('DELETE FROM usuario_permiso WHERE id_usuario = ?', [idUsuario]);

    if (nombresPermiso.length === 0) return;

    const [permisos] = await this.db.query(
      `SELECT id_permiso, nombre_permiso
       FROM permiso
       WHERE nombre_permiso IN (${nombresPermiso.map(() => '?').join(',')})`,
      nombresPermiso,
    );

    for (const permiso of permisos) {
      await this.db.query('INSERT INTO usuario_permiso (id_usuario, id_permiso) VALUES (?, ?)', [
        idUsuario,
        permiso.id_permiso,
      ]);
    }
  }

  private async prepararUsuario(usuario: any) {
    const { contrasena, password, ...safeUser } = usuario;
    Object.keys(safeUser).forEach((key) => {
      const normalized = key.toLowerCase();
      if (normalized.includes('contrase') || normalized === 'password') {
        delete safeUser[key];
      }
    });

    const nombresPermiso = await this.obtenerNombresPermiso(Number(usuario.id_usuario));
    return {
      ...safeUser,
      apellidoP: safeUser.apellidoP ?? safeUser.apellidop ?? '',
      apellidoM: safeUser.apellidoM ?? safeUser.apellidom ?? '',
      privilegios: this.permisosAPrivilegios(nombresPermiso, usuario.rol),
    };
  }

  async login(payload: LoginDto) {
    await this.ensureActiveColumn();
    const passwordColumn = await this.getPasswordColumn();
    const [rows] = await this.db.query('SELECT * FROM usuario WHERE telefono = ? AND activo = 1 LIMIT 1', [payload.telefono]);

    if (rows.length === 0) {
      return { success: false, mensaje: 'Credenciales incorrectas' };
    }

    const usuario = rows[0];
    const storedPassword = usuario[passwordColumn];
    const validPassword = await this.passwordMatches(payload.contrasenia, storedPassword);

    if (!validPassword) {
      return { success: false, mensaje: 'Credenciales incorrectas' };
    }

    if (!this.isBcryptHash(storedPassword)) {
      const hashedPassword = await this.hashPassword(payload.contrasenia);
      await this.db.query(`UPDATE usuario SET ${this.escapeIdentifier(passwordColumn)} = ? WHERE id_usuario = ?`, [
        hashedPassword,
        usuario.id_usuario,
      ]);
    }

    return { success: true, usuario: await this.prepararUsuario(usuario) };
  }

  async listarUsuarios() {
    await this.ensureActiveColumn();
    await this.ensureEmailColumn();
    const [rows] = await this.db.query('SELECT id_usuario, nombre, apellidoP, apellidoM, rol, telefono, correo FROM usuario WHERE activo = 1');
    return Promise.all(rows.map((usuario) => this.prepararUsuario(usuario)));
  }

  async buscarUsuario(telefono: string) {
    await this.ensureActiveColumn();
    await this.ensureEmailColumn();
    const [rows] = await this.db.query(
      'SELECT id_usuario, nombre, apellidoP, apellidoM, telefono, correo, rol FROM usuario WHERE telefono = ? AND activo = 1',
      [telefono],
    );

    if (rows.length > 0) {
      return this.prepararUsuario(rows[0]);
    }

    return null;
  }

  async registrarUsuario(payload: CreateUserDto) {
    await this.ensureActiveColumn();
    await this.ensureEmailColumn();
    const passwordColumn = await this.getPasswordColumn();
    const [usuarios] = await this.db.query('SELECT id_usuario FROM usuario WHERE telefono = ?', [payload.telefono]);

    if (usuarios.length > 0) {
      return {
        success: false,
        error: 'Este numero de telefono ya se encuentra registrado con otro colaborador.',
      };
    }

    if (payload.correo) {
      const [correos] = await this.db.query('SELECT id_usuario FROM usuario WHERE LOWER(correo) = LOWER(?) AND activo = 1', [
        payload.correo,
      ]);

      if (correos.length > 0) {
        return {
          success: false,
          error: 'Este correo ya se encuentra registrado con otro colaborador.',
        };
      }
    }

    const hashedPassword = await this.hashPassword(payload.contrasenia);
    const [result] = await this.db.query(
      `INSERT INTO usuario (nombre, apellidoP, apellidoM, telefono, correo, ${this.escapeIdentifier(passwordColumn)}, rol) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [payload.nombre, payload.apellidoP, payload.apellidoM || '', payload.telefono, payload.correo || null, hashedPassword, payload.rol],
    );

    await this.sincronizarPermisos(result.insertId, payload.privilegios || {}, payload.rol);

    return {
      success: true,
      id_usuario: result.insertId,
      mensaje: 'Personal operativo registrado con exito',
    };
  }

  async actualizarUsuario(idUsuario: string, payload: UpdateUserDto) {
    await this.ensureActiveColumn();
    await this.ensureEmailColumn();
    const passwordColumn = await this.getPasswordColumn();
    const hashedPassword = await this.hashPassword(payload.contrasenia);

    if (payload.correo) {
      const [correos] = await this.db.query(
        'SELECT id_usuario FROM usuario WHERE LOWER(correo) = LOWER(?) AND id_usuario <> ? AND activo = 1',
        [payload.correo, idUsuario],
      );

      if (correos.length > 0) {
        return { success: false, error: 'Este correo ya se encuentra registrado con otro colaborador.' };
      }
    }

    await this.db.query(
      `UPDATE usuario SET nombre = ?, apellidoP = ?, apellidoM = ?, telefono = ?, correo = ?, ${this.escapeIdentifier(passwordColumn)} = ?, rol = ? WHERE id_usuario = ?`,
      [payload.nombre, payload.apellidoP, payload.apellidoM || '', payload.telefono, payload.correo || null, hashedPassword, payload.rol, idUsuario],
    );

    await this.sincronizarPermisos(Number(idUsuario), payload.privilegios || {}, payload.rol);

    return { success: true, mensaje: 'Credenciales actualizadas correctamente' };
  }

  async recuperarContrasena(metodo: 'telefono' | 'correo', identificador: string) {
    await this.ensureActiveColumn();
    await this.ensureEmailColumn();
    const passwordColumn = await this.getPasswordColumn();
    const campo = metodo === 'correo' ? 'correo' : 'telefono';
    const valor = identificador.trim();

    const [rows] = await this.db.query(
      `SELECT id_usuario, nombre, telefono, correo FROM usuario WHERE ${campo} = ? AND activo = 1 LIMIT 1`,
      [valor],
    );

    if (rows.length === 0) {
      return { success: false, error: 'No encontramos un usuario activo con esos datos.' };
    }

    const contrasenaTemporal = this.generarContrasenaTemporal();
    const hashedPassword = await this.hashPassword(contrasenaTemporal);

    await this.db.query(`UPDATE usuario SET ${this.escapeIdentifier(passwordColumn)} = ? WHERE id_usuario = ?`, [
      hashedPassword,
      rows[0].id_usuario,
    ]);

    return {
      success: true,
      mensaje:
        metodo === 'correo'
          ? `Se envio una contrasena temporal al correo ${rows[0].correo}.`
          : `Se envio una contrasena temporal al telefono ${rows[0].telefono}.`,
      contrasenaTemporal,
    };
  }

  async eliminarUsuario(idUsuario: string) {
    await this.ensureActiveColumn();

    const [usuarios] = await this.db.query('SELECT id_usuario, telefono, activo FROM usuario WHERE id_usuario = ? LIMIT 1', [
      idUsuario,
    ]);

    if (usuarios.length === 0 || Number(usuarios[0].activo) === 0) {
      return { success: false, error: 'El usuario no existe o ya fue eliminado.' };
    }

    await this.db.query('UPDATE usuario SET activo = 0, telefono = CONCAT("DEL", id_usuario) WHERE id_usuario = ?', [
      idUsuario,
    ]);

    return { success: true, mensaje: 'Usuario eliminado correctamente. Sus ventas historicas se conservaron para reportes.' };
  }
}
