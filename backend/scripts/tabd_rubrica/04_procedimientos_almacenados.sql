-- ============================================================
-- RUBRICA TABD 3P - PROCEDIMIENTOS, PARAMETROS Y TRANSACCIONES
-- Criterios cubiertos:
-- 10. Usa BEGIN/START TRANSACTION, COMMIT y ROLLBACK.
-- 11. Demuestra atomicidad, consistencia, aislamiento y durabilidad.
-- 13. Crea procedimientos sin errores de sintaxis.
-- 14. Implementa parametros IN y OUT.
-- 15. Declara y usa variables.
-- 16. Usa IF, CASE, LOOP y cursores.
-- Descripcion:
-- Este script agrega procedimientos almacenados para reportar ventas,
-- registrar ventas de forma transaccional y recalcular totales.
-- ============================================================

USE stockbloomdb;

DELIMITER $$

-- Punto de rubrica: Procedimiento con parametros de entrada y salida.
-- Descripcion: Genera un reporte diario de ventas. Recibe una fecha
-- y devuelve totales mediante parametros OUT.
DROP PROCEDURE IF EXISTS sp_reporte_ventas_diario $$
CREATE PROCEDURE sp_reporte_ventas_diario(
  IN p_fecha DATE,
  OUT p_total_ventas INT,
  OUT p_total_unidades INT,
  OUT p_total_importe DECIMAL(10,2)
)
BEGIN
  -- Punto de rubrica: Declara y utiliza variables.
  -- Descripcion: v_fecha permite usar la fecha enviada o la fecha actual.
  DECLARE v_fecha DATE;

  SET v_fecha = COALESCE(p_fecha, CURDATE());

  SELECT
    COUNT(DISTINCT v.id_venta),
    COALESCE(SUM(dv.cantidad), 0),
    COALESCE(SUM(dv.subtotal), 0)
  INTO p_total_ventas, p_total_unidades, p_total_importe
  FROM venta v
  LEFT JOIN detalle_venta dv ON v.id_venta = dv.id_venta
  WHERE DATE(v.fecha) = v_fecha;

  SELECT
    v.id_venta,
    v.fecha,
    v.total,
    p.nombre_comun,
    dv.cantidad,
    dv.precio_unitario,
    dv.subtotal
  FROM venta v
  INNER JOIN detalle_venta dv ON v.id_venta = dv.id_venta
  INNER JOIN planta p ON dv.id_planta = p.id_planta
  WHERE DATE(v.fecha) = v_fecha
  ORDER BY v.fecha DESC, p.nombre_comun ASC;
END $$

-- Punto de rubrica: Transacciones y recuperacion.
-- Descripcion: Registra una venta simple. Si ocurre cualquier error,
-- se ejecuta ROLLBACK para no dejar datos incompletos.
DROP PROCEDURE IF EXISTS sp_registrar_venta_simple $$
CREATE PROCEDURE sp_registrar_venta_simple(
  IN p_id_usuario INT,
  IN p_id_planta INT,
  IN p_cantidad INT,
  IN p_tipo_precio VARCHAR(20),
  OUT p_id_venta INT,
  OUT p_mensaje VARCHAR(180)
)
BEGIN
  -- Punto de rubrica: Variables internas.
  -- Descripcion: Guardan stock, precio y subtotal calculado durante la venta.
  DECLARE v_stock_actual INT DEFAULT 0;
  DECLARE v_precio DECIMAL(10,2) DEFAULT 0;
  DECLARE v_subtotal DECIMAL(10,2) DEFAULT 0;
  DECLARE v_error BOOLEAN DEFAULT FALSE;

  -- Punto de rubrica: Recuperacion ante fallos.
  -- Descripcion: El handler captura errores SQL y revierte la transaccion.
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
  BEGIN
    SET v_error = TRUE;
    ROLLBACK;
    SET p_id_venta = NULL;
    SET p_mensaje = 'Error: la venta fue revertida con ROLLBACK.';
  END;

  -- Punto de rubrica: START TRANSACTION.
  -- Descripcion: A partir de aqui la venta se ejecuta de forma atomica.
  START TRANSACTION;

  -- Punto de rubrica: Aislamiento.
  -- Descripcion: FOR UPDATE bloquea la fila de planta mientras se valida
  -- stock para evitar ventas simultaneas inconsistentes.
  SELECT stock,
    -- Punto de rubrica: Estructura CASE.
    -- Descripcion: Selecciona precio de mayoreo o menudeo segun parametro.
    CASE
      WHEN LOWER(p_tipo_precio) = 'mayoreo' THEN precio_mayoreo
      ELSE precio_menudeo
    END
  INTO v_stock_actual, v_precio
  FROM planta
  WHERE id_planta = p_id_planta
  FOR UPDATE;

  -- Punto de rubrica: Estructura IF.
  -- Descripcion: Valida planta existente, cantidad valida y stock suficiente.
  IF v_stock_actual IS NULL THEN
    SET v_error = TRUE;
    SET p_mensaje = 'La planta no existe.';
    ROLLBACK;
  ELSEIF p_cantidad <= 0 THEN
    SET v_error = TRUE;
    SET p_mensaje = 'La cantidad debe ser mayor a cero.';
    ROLLBACK;
  ELSEIF v_stock_actual < p_cantidad THEN
    SET v_error = TRUE;
    SET p_mensaje = 'Stock insuficiente.';
    ROLLBACK;
  ELSE
    SET v_subtotal = p_cantidad * v_precio;

    INSERT INTO venta(fecha, total, id_usuario)
    VALUES (NOW(), v_subtotal, p_id_usuario);

    SET p_id_venta = LAST_INSERT_ID();

    INSERT INTO detalle_venta(id_venta, id_planta, cantidad, precio_unitario, subtotal)
    VALUES (p_id_venta, p_id_planta, p_cantidad, v_precio, v_subtotal);

    UPDATE planta
    SET stock = stock - p_cantidad
    WHERE id_planta = p_id_planta;

    -- Punto de rubrica: COMMIT.
    -- Descripcion: Confirma la venta solo cuando todos los pasos terminaron bien.
    COMMIT;
    SET p_mensaje = 'Venta registrada correctamente con COMMIT.';
  END IF;
END $$

-- Punto de rubrica: Ciclos y mantenimiento.
-- Descripcion: Recorre ventas con cursor y LOOP para recalcular totales
-- a partir de sus detalles.
DROP PROCEDURE IF EXISTS sp_recalcular_totales_ventas $$
CREATE PROCEDURE sp_recalcular_totales_ventas(OUT p_ventas_actualizadas INT)
BEGIN
  -- Punto de rubrica: Variables y cursor.
  -- Descripcion: Variables usadas para recorrer venta por venta.
  DECLARE v_id_venta INT;
  DECLARE v_total DECIMAL(10,2);
  DECLARE v_fin INT DEFAULT 0;

  DECLARE cur_ventas CURSOR FOR
    SELECT v.id_venta, COALESCE(SUM(dv.subtotal), 0)
    FROM venta v
    LEFT JOIN detalle_venta dv ON v.id_venta = dv.id_venta
    GROUP BY v.id_venta;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_fin = 1;

  SET p_ventas_actualizadas = 0;

  OPEN cur_ventas;

  -- Punto de rubrica: Ciclo LOOP.
  -- Descripcion: Procesa cada venta hasta que el cursor termina.
  ciclo_ventas: LOOP
    FETCH cur_ventas INTO v_id_venta, v_total;

    IF v_fin = 1 THEN
      LEAVE ciclo_ventas;
    END IF;

    UPDATE venta
    SET total = v_total
    WHERE id_venta = v_id_venta;

    SET p_ventas_actualizadas = p_ventas_actualizadas + 1;
  END LOOP;

  CLOSE cur_ventas;
END $$

DELIMITER ;

-- Prueba rapida:
-- CALL sp_reporte_ventas_diario(CURDATE(), @ventas, @unidades, @importe);
-- SELECT @ventas AS ventas, @unidades AS unidades, @importe AS importe;
