-- ============================================================
-- RUBRICA TABD 3P - PRUEBAS, FALLLOS Y DOCUMENTACION
-- Criterios cubiertos:
-- 9. Comprueba informacion recuperada consistente y funcional.
-- 12. Ejecuta pruebas donde se presentan fallos y recuperacion.
-- 21. Presenta pruebas del procedimiento y trigger.
-- 22 y 23. Explica resultados obtenidos.
-- Descripcion:
-- Este script contiene pruebas verificables para demostrar que tablas,
-- permisos, procedimientos, transacciones, triggers y consistencia
-- funcionan correctamente.
-- ============================================================

USE stockbloomdb;

-- Punto de rubrica: Creacion e implementacion de base de datos.
-- Descripcion: Verifica que las tablas principales existan y que sus
-- columnas se hayan creado correctamente.
SHOW TABLES;
DESCRIBE planta;
DESCRIBE venta;
DESCRIBE detalle_venta;

-- Punto de rubrica: Usuarios, roles y permisos.
-- Descripcion: Muestra los privilegios concedidos a perfiles operativos
-- para comprobar control de acceso.
SHOW GRANTS FOR 'sb_cajero'@'localhost';
SHOW GRANTS FOR 'sb_inventario'@'localhost';

-- Punto de rubrica: Procedimientos almacenados con parametros.
-- Descripcion: Ejecuta el procedimiento con parametro IN y consulta
-- parametros OUT para demostrar resultados.
CALL sp_reporte_ventas_diario(CURDATE(), @total_ventas, @total_unidades, @total_importe);
SELECT @total_ventas AS total_ventas, @total_unidades AS total_unidades, @total_importe AS total_importe;

-- Punto de rubrica: START TRANSACTION y ROLLBACK.
-- Descripcion: Inserta datos temporales y despues revierte la operacion.
-- Sirve para demostrar atomicidad y recuperacion.
START TRANSACTION;

INSERT INTO planta(nombre_comun, nombre_cientifico, stock, ambiente, temporada, categoria, precio_mayoreo, precio_menudeo, descripcion)
VALUES ('Prueba TABD', 'Testus tabd', 10, 'Mixta', 'Todo el anio', 'Pruebas', 10.00, 15.00, 'Registro temporal de prueba');

SET @id_planta_prueba = LAST_INSERT_ID();

INSERT INTO venta(fecha, total, id_usuario)
SELECT NOW(), 30.00, id_usuario
FROM usuario
ORDER BY id_usuario
LIMIT 1;

SET @id_venta_prueba = LAST_INSERT_ID();

INSERT INTO detalle_venta(id_venta, id_planta, cantidad, precio_unitario, subtotal)
VALUES (@id_venta_prueba, @id_planta_prueba, 2, 15.00, 30.00);

SELECT 'Antes de ROLLBACK' AS etapa, COUNT(*) AS registros_prueba
FROM detalle_venta
WHERE id_venta = @id_venta_prueba;

-- Punto de rubrica: Recuperacion.
-- Descripcion: ROLLBACK elimina todos los cambios hechos desde START TRANSACTION.
ROLLBACK;

SELECT 'Despues de ROLLBACK' AS etapa, COUNT(*) AS registros_prueba
FROM detalle_venta
WHERE id_venta = @id_venta_prueba;

-- Punto de rubrica: Prueba de trigger y fallo controlado.
-- Descripcion: Al descomentar esta prueba, el trigger bloquea cantidades
-- invalidas y muestra el mensaje de error esperado.
-- INSERT INTO detalle_venta(id_venta, id_planta, cantidad, precio_unitario, subtotal)
-- VALUES (1, 1, 0, 10.00, 0.00);

-- Punto de rubrica: Consistencia de informacion.
-- Descripcion: Recalcula totales y verifica que cada venta coincida con
-- la suma de sus detalles.
CALL sp_recalcular_totales_ventas(@ventas_actualizadas);
SELECT @ventas_actualizadas AS ventas_actualizadas;

SELECT v.id_venta, v.total, COALESCE(SUM(dv.subtotal), 0) AS total_detalles
FROM venta v
LEFT JOIN detalle_venta dv ON v.id_venta = dv.id_venta
GROUP BY v.id_venta, v.total
HAVING ROUND(v.total, 2) <> ROUND(total_detalles, 2);

-- Si la consulta anterior no devuelve filas, la consistencia de totales es correcta.
