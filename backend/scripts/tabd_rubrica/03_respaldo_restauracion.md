# Respaldo y restauracion

## Respaldo completo

```bash
mysqldump -u root -p --routines --triggers --single-transaction stockbloomdb > stockbloomdb_respaldo_completo.sql
```

Incluye:

- Estructura de tablas.
- Datos.
- Procedimientos almacenados.
- Triggers.

## Respaldo solo de estructura

```bash
mysqldump -u root -p --no-data stockbloomdb > stockbloomdb_estructura.sql
```

## Respaldo solo de datos

```bash
mysqldump -u root -p --no-create-info stockbloomdb > stockbloomdb_datos.sql
```

## Restauracion

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS stockbloomdb_restaurada;"
mysql -u root -p stockbloomdb_restaurada < stockbloomdb_respaldo_completo.sql
```

## Comprobacion de consistencia

```sql
USE stockbloomdb_restaurada;

SELECT COUNT(*) AS total_plantas FROM planta;
SELECT COUNT(*) AS total_ventas FROM venta;
SELECT COUNT(*) AS total_detalles FROM detalle_venta;
SELECT COUNT(*) AS total_produccion FROM produccion;

SELECT v.id_venta, v.total, COALESCE(SUM(dv.subtotal), 0) AS total_detalles
FROM venta v
LEFT JOIN detalle_venta dv ON v.id_venta = dv.id_venta
GROUP BY v.id_venta, v.total
HAVING ROUND(v.total, 2) <> ROUND(total_detalles, 2);
```

Si la ultima consulta no devuelve registros, los totales de ventas son consistentes.

## Prueba de recuperacion ante fallo

1. Realizar respaldo completo.
2. Eliminar un registro de prueba.
3. Restaurar en una base alterna.
4. Verificar conteos y totales.
5. Confirmar que la aplicacion puede conectarse a la base restaurada ajustando `DB_NAME`.
