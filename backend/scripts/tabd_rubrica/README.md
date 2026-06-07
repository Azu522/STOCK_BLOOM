# Paquete de cumplimiento TABD 3P - Stock Bloom

Este paquete contiene la evidencia tecnica para cubrir la rubrica de Taller de Base de Datos:

- Diseno conceptual y logico de la base de datos.
- Implementacion de estructura, llaves, restricciones y normalizacion.
- Conexion de la aplicacion con MySQL.
- Seguridad con usuarios, roles, permisos y control de acceso.
- Respaldo y restauracion.
- Transacciones con `START TRANSACTION`, `COMMIT` y `ROLLBACK`.
- Procedimientos almacenados con parametros, variables y estructuras de control.
- Triggers con `BEFORE` y `AFTER`.
- Pruebas funcionales y de recuperacion.

## Orden sugerido de revision

1. `modelo_conceptual_logico.md`
2. `01_schema_referencia.sql`
3. `02_seguridad_roles_permisos.sql`
4. `03_respaldo_restauracion.md`
5. `04_procedimientos_almacenados.sql`
6. `05_triggers_auditoria_validaciones.sql`
7. `06_pruebas_integrales.sql`
8. `matriz_cumplimiento_rubrica.md`

## Notas de ejecucion

Los scripts estan pensados para MySQL 8 sobre la base `stockbloomdb`.

Antes de ejecutar scripts que modifican estructura o datos, realiza un respaldo:

```bash
mysqldump -u root -p stockbloomdb > stockbloomdb_backup.sql
```

Los triggers y procedimientos pueden instalarse desde MySQL Workbench abriendo el archivo y ejecutandolo contra el schema `stockbloomdb`.
