-- ============================================================
-- RUBRICA TABD 3P - TRIGGERS, VALIDACIONES Y AUDITORIA
-- Criterios cubiertos:
-- 17. Trigger implementado sin errores de sintaxis.
-- 18. Uso correcto de BEFORE y AFTER.
-- 19. Automatiza validaciones y acciones requeridas.
-- 20. Usa registros logicos NEW y OLD en MySQL.
-- Descripcion:
-- Este script crea triggers para validar reglas de negocio antes de
-- guardar datos y registrar auditoria despues de movimientos importantes.
-- ============================================================

USE stockbloomdb;

-- Punto de rubrica: Auditoria y mantenimiento.
-- Descripcion: Tabla donde los triggers guardan eventos automaticos.
CREATE TABLE IF NOT EXISTS auditoria_movimiento (
  id_auditoria INT AUTO_INCREMENT PRIMARY KEY,
  tabla_afectada VARCHAR(80) NOT NULL,
  accion VARCHAR(40) NOT NULL,
  id_referencia INT,
  descripcion VARCHAR(255),
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DELIMITER $$

-- Punto de rubrica: Trigger BEFORE.
-- Descripcion: Antes de actualizar una planta, valida que stock y precios
-- no sean negativos.
DROP TRIGGER IF EXISTS trg_planta_bu_validar $$
CREATE TRIGGER trg_planta_bu_validar
BEFORE UPDATE ON planta
FOR EACH ROW
BEGIN
  -- Punto de rubrica: Uso de NEW.
  -- Descripcion: NEW representa los nuevos valores que se intentan guardar.
  IF NEW.stock < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El stock no puede ser negativo.';
  END IF;

  IF NEW.precio_mayoreo < 0 OR NEW.precio_menudeo < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Los precios no pueden ser negativos.';
  END IF;
END $$

-- Punto de rubrica: Trigger BEFORE INSERT.
-- Descripcion: Antes de insertar un detalle de venta, valida cantidad,
-- existencia de planta, stock disponible y calcula el subtotal.
DROP TRIGGER IF EXISTS trg_detalle_venta_bi_validar $$
CREATE TRIGGER trg_detalle_venta_bi_validar
BEFORE INSERT ON detalle_venta
FOR EACH ROW
BEGIN
  -- Punto de rubrica: Variable dentro del trigger.
  -- Descripcion: Guarda el stock actual de la planta para validarlo.
  DECLARE v_stock INT DEFAULT 0;

  IF NEW.cantidad <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La cantidad vendida debe ser mayor a cero.';
  END IF;

  SELECT stock INTO v_stock
  FROM planta
  WHERE id_planta = NEW.id_planta;

  IF v_stock IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La planta no existe.';
  END IF;

  IF v_stock < NEW.cantidad THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock insuficiente para realizar la venta.';
  END IF;

  -- Punto de rubrica: Automatizacion.
  -- Descripcion: Calcula subtotal automaticamente para evitar errores manuales.
  SET NEW.subtotal = NEW.cantidad * NEW.precio_unitario;
END $$

-- Punto de rubrica: Trigger AFTER INSERT.
-- Descripcion: Despues de insertar un detalle de venta, registra auditoria.
DROP TRIGGER IF EXISTS trg_detalle_venta_ai_auditar $$
CREATE TRIGGER trg_detalle_venta_ai_auditar
AFTER INSERT ON detalle_venta
FOR EACH ROW
BEGIN
  -- Punto de rubrica: Uso de NEW despues de insertar.
  -- Descripcion: Guarda en auditoria los datos recien insertados.
  INSERT INTO auditoria_movimiento(tabla_afectada, accion, id_referencia, descripcion)
  VALUES (
    'detalle_venta',
    'INSERT',
    NEW.id_detalle,
    CONCAT('Venta ', NEW.id_venta, ', planta ', NEW.id_planta, ', cantidad ', NEW.cantidad)
  );
END $$

-- Punto de rubrica: Trigger AFTER DELETE.
-- Descripcion: Despues de eliminar una planta, registra que planta fue borrada.
DROP TRIGGER IF EXISTS trg_planta_ad_auditar $$
CREATE TRIGGER trg_planta_ad_auditar
AFTER DELETE ON planta
FOR EACH ROW
BEGIN
  -- Punto de rubrica: Uso de OLD.
  -- Descripcion: OLD contiene los valores que tenia la fila antes de borrarse.
  INSERT INTO auditoria_movimiento(tabla_afectada, accion, id_referencia, descripcion)
  VALUES (
    'planta',
    'DELETE',
    OLD.id_planta,
    CONCAT('Planta eliminada: ', OLD.nombre_comun)
  );
END $$

DELIMITER ;
