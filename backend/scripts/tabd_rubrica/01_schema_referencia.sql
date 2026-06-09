-- ============================================================
-- RUBRICA TABD 3P - PUNTOS 1, 2 Y 5 DEL PROYECTO INTEGRADOR
-- Descripcion:
-- Este script demuestra el diseno logico y la implementacion fisica
-- de la base de datos Stock Bloom. Crea tablas normalizadas, llaves
-- primarias, llaves foraneas, restricciones CHECK e indices para
-- mantener integridad, consistencia y buen rendimiento.
-- ============================================================

USE stockbloomdb;

-- Punto de rubrica: Diseno conceptual y logico de la base de datos.
-- Descripcion: Tabla principal del catalogo de plantas del invernadero.
-- Incluye validaciones para evitar stock o precios negativos.
CREATE TABLE IF NOT EXISTS planta (
  id_planta INT AUTO_INCREMENT PRIMARY KEY,
  nombre_comun VARCHAR(100) NOT NULL,
  nombre_cientifico VARCHAR(150),
  stock INT NOT NULL DEFAULT 0,
  ambiente VARCHAR(60) NOT NULL,
  temporada VARCHAR(60) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  precio_mayoreo DECIMAL(10,2) NOT NULL DEFAULT 0,
  precio_menudeo DECIMAL(10,2) NOT NULL DEFAULT 0,
  descripcion VARCHAR(255),
  CONSTRAINT chk_planta_stock CHECK (stock >= 0),
  CONSTRAINT chk_planta_precio_mayoreo CHECK (precio_mayoreo >= 0),
  CONSTRAINT chk_planta_precio_menudeo CHECK (precio_menudeo >= 0)
);

-- Punto de rubrica: Administracion y seguridad.
-- Descripcion: Tabla de usuarios que acceden al sistema. Cada usuario
-- tiene rol y credenciales para controlar el acceso a los modulos.
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  apellidoP VARCHAR(80) NOT NULL,
  apellidoM VARCHAR(80),
  telefono VARCHAR(20) NOT NULL UNIQUE,
  correo VARCHAR(120),
  contrasenia VARCHAR(255) NOT NULL,
  rol VARCHAR(40) NOT NULL
);

-- Punto de rubrica: Usuarios, roles y permisos.
-- Descripcion: Catalogo de permisos funcionales usados por la aplicacion
-- para limitar acciones como vender, consultar inventario o administrar.
CREATE TABLE IF NOT EXISTS permiso (
  id_permiso INT AUTO_INCREMENT PRIMARY KEY,
  nombre_permiso VARCHAR(80) NOT NULL UNIQUE,
  descripcion VARCHAR(180)
);

-- Punto de rubrica: Asignacion de permisos necesarios.
-- Descripcion: Relacion muchos-a-muchos entre usuarios y permisos.
-- Evita duplicidad usando llave primaria compuesta.
CREATE TABLE IF NOT EXISTS usuario_permiso (
  id_usuario INT NOT NULL,
  id_permiso INT NOT NULL,
  PRIMARY KEY (id_usuario, id_permiso),
  CONSTRAINT fk_usuario_permiso_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_usuario_permiso_permiso
    FOREIGN KEY (id_permiso) REFERENCES permiso(id_permiso) ON DELETE CASCADE
);

-- Punto de rubrica: Confiabilidad e integridad.
-- Descripcion: Encabezado de ventas. Se relaciona con usuario para saber
-- quien registro la venta y conserva el total de la operacion.
CREATE TABLE IF NOT EXISTS venta (
  id_venta INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATETIME NOT NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  id_usuario INT NOT NULL,
  CONSTRAINT chk_venta_total CHECK (total >= 0),
  CONSTRAINT fk_venta_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

-- Punto de rubrica: Normalizacion e integridad referencial.
-- Descripcion: Detalle de cada venta. Se separa de venta para permitir
-- multiples plantas por ticket y conservar cantidades, precio y subtotal.
CREATE TABLE IF NOT EXISTS detalle_venta (
  id_detalle INT AUTO_INCREMENT PRIMARY KEY,
  id_venta INT NOT NULL,
  id_planta INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0),
  CONSTRAINT chk_detalle_precio CHECK (precio_unitario >= 0),
  CONSTRAINT chk_detalle_subtotal CHECK (subtotal >= 0),
  CONSTRAINT fk_detalle_venta
    FOREIGN KEY (id_venta) REFERENCES venta(id_venta) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_planta
    FOREIGN KEY (id_planta) REFERENCES planta(id_planta)
);

-- Punto de rubrica: Modelo completo acorde al sistema.
-- Descripcion: Registra lotes de produccion interna asociados a plantas.
-- Permite controlar siembra, cosecha y observaciones.
CREATE TABLE IF NOT EXISTS produccion (
  id_produccion INT AUTO_INCREMENT PRIMARY KEY,
  id_planta INT NOT NULL,
  cantidad INT NOT NULL,
  fecha_siembra DATE NOT NULL,
  fecha_cosecha DATE,
  observaciones TEXT,
  CONSTRAINT chk_produccion_cantidad CHECK (cantidad > 0),
  CONSTRAINT fk_produccion_planta
    FOREIGN KEY (id_planta) REFERENCES planta(id_planta) ON DELETE CASCADE
);

-- Punto de rubrica: Funcionamiento y mantenimiento.
-- Descripcion: Indices que aceleran consultas frecuentes por fecha,
-- planta, venta y produccion.
CREATE INDEX idx_venta_fecha ON venta(fecha);
CREATE INDEX idx_detalle_venta_id_venta ON detalle_venta(id_venta);
CREATE INDEX idx_detalle_venta_id_planta ON detalle_venta(id_planta);
CREATE INDEX idx_produccion_id_planta ON produccion(id_planta);
