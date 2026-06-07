-- ============================================================
-- RUBRICA TABD 3P - SEGURIDAD, USUARIOS, ROLES Y PERMISOS
-- Criterios cubiertos:
-- 1. Crea usuarios, roles y permisos.
-- 2. Asigna unicamente permisos necesarios.
-- 3. Configura contrasenas y control de acceso.
-- 4. Usa CREATE USER, GRANT, REVOKE y roles.
-- 5. Evita accesos indebidos mediante privilegios limitados.
-- Descripcion:
-- Este script crea roles separados por responsabilidad para que cada
-- usuario de MySQL tenga solo las operaciones indispensables.
-- ============================================================

-- Ejecutar con usuario administrador de MySQL.
-- Ajusta las contrasenas antes de entregar o instalar en un ambiente real.

-- Punto de rubrica: Crea correctamente usuarios, roles y permisos.
-- Descripcion: Los roles representan perfiles de uso del sistema.
CREATE ROLE IF NOT EXISTS 'stockbloom_admin';
CREATE ROLE IF NOT EXISTS 'stockbloom_cajero';
CREATE ROLE IF NOT EXISTS 'stockbloom_inventario';
CREATE ROLE IF NOT EXISTS 'stockbloom_consulta';

-- Punto de rubrica: Configura mecanismos basicos de seguridad.
-- Descripcion: Usuarios con contrasenas fuertes de ejemplo. En ambiente
-- real se recomienda cambiarlas y no dejarlas escritas en repositorios.
CREATE USER IF NOT EXISTS 'sb_admin'@'localhost' IDENTIFIED BY 'Admin#StockBloom2026!';
CREATE USER IF NOT EXISTS 'sb_cajero'@'localhost' IDENTIFIED BY 'Caja#StockBloom2026!';
CREATE USER IF NOT EXISTS 'sb_inventario'@'localhost' IDENTIFIED BY 'Inventario#StockBloom2026!';
CREATE USER IF NOT EXISTS 'sb_reporte'@'localhost' IDENTIFIED BY 'Reporte#StockBloom2026!';

-- Punto de rubrica: Administracion total.
-- Descripcion: El rol administrador puede operar todo el schema.
GRANT ALL PRIVILEGES ON stockbloomdb.* TO 'stockbloom_admin';

-- Punto de rubrica: Asigna unicamente permisos necesarios.
-- Descripcion: El cajero solo consulta plantas y registra ventas.
-- No puede borrar plantas, usuarios ni modificar configuraciones.
GRANT SELECT ON stockbloomdb.planta TO 'stockbloom_cajero';
GRANT SELECT, INSERT ON stockbloomdb.venta TO 'stockbloom_cajero';
GRANT SELECT, INSERT ON stockbloomdb.detalle_venta TO 'stockbloom_cajero';
GRANT EXECUTE ON stockbloomdb.* TO 'stockbloom_cajero';

-- Punto de rubrica: Control de acceso por funcion.
-- Descripcion: Inventario administra plantas y produccion, pero solo
-- consulta ventas para revisar movimientos.
GRANT SELECT, INSERT, UPDATE, DELETE ON stockbloomdb.planta TO 'stockbloom_inventario';
GRANT SELECT, INSERT, UPDATE, DELETE ON stockbloomdb.produccion TO 'stockbloom_inventario';
GRANT SELECT ON stockbloomdb.venta TO 'stockbloom_inventario';
GRANT SELECT ON stockbloomdb.detalle_venta TO 'stockbloom_inventario';

-- Punto de rubrica: Permisos de solo lectura.
-- Descripcion: El usuario de reportes solo consulta informacion.
GRANT SELECT ON stockbloomdb.planta TO 'stockbloom_consulta';
GRANT SELECT ON stockbloomdb.venta TO 'stockbloom_consulta';
GRANT SELECT ON stockbloomdb.detalle_venta TO 'stockbloom_consulta';
GRANT SELECT ON stockbloomdb.produccion TO 'stockbloom_consulta';

-- Punto de rubrica: Asignacion de roles a usuarios.
-- Descripcion: Cada cuenta recibe su rol operativo correspondiente.
GRANT 'stockbloom_admin' TO 'sb_admin'@'localhost';
GRANT 'stockbloom_cajero' TO 'sb_cajero'@'localhost';
GRANT 'stockbloom_inventario' TO 'sb_inventario'@'localhost';
GRANT 'stockbloom_consulta' TO 'sb_reporte'@'localhost';

SET DEFAULT ROLE 'stockbloom_admin' TO 'sb_admin'@'localhost';
SET DEFAULT ROLE 'stockbloom_cajero' TO 'sb_cajero'@'localhost';
SET DEFAULT ROLE 'stockbloom_inventario' TO 'sb_inventario'@'localhost';
SET DEFAULT ROLE 'stockbloom_consulta' TO 'sb_reporte'@'localhost';

-- Punto de rubrica: Emplea REVOKE y GRANT.
-- Descripcion: Ejemplo documentado para retirar y restaurar permisos.
-- REVOKE DELETE ON stockbloomdb.planta FROM 'stockbloom_inventario';
-- GRANT DELETE ON stockbloomdb.planta TO 'stockbloom_inventario';

-- Punto de rubrica: Pruebas de permisos.
-- Descripcion: Muestra los privilegios efectivos de usuarios clave.
SHOW GRANTS FOR 'sb_cajero'@'localhost';
SHOW GRANTS FOR 'sb_inventario'@'localhost';
