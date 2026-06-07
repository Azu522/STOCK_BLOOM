# Matriz de cumplimiento de rubrica TABD 3P

## Reporte de practica

| Criterio | Evidencia en Stock Bloom |
|---|---|
| Usuarios, roles y permisos | `02_seguridad_roles_permisos.sql` crea roles `stockbloom_admin`, `stockbloom_cajero`, `stockbloom_inventario` y `stockbloom_consulta`. |
| Permisos minimos necesarios | El cajero solo puede consultar plantas, registrar ventas y ejecutar el procedimiento de venta. Inventario administra plantas/produccion. Consulta solo tiene `SELECT`. |
| Seguridad basica | Usuarios con contrasenas, roles, privilegios limitados y control de acceso en la aplicacion mediante privilegios por usuario. |
| GRANT, REVOKE, CREATE USER, ALTER USER | `02_seguridad_roles_permisos.sql` incluye `CREATE USER`, `CREATE ROLE`, `GRANT` y ejemplos de `REVOKE`. |
| Restricciones y validaciones | `01_schema_referencia.sql` define `CHECK`, PK, FK e indices. `05_triggers_auditoria_validaciones.sql` bloquea stock/precios invalidos. |
| Riesgos y mejoras | Ver seccion "Riesgos y mejoras" de este documento. |
| Respaldo | `03_respaldo_restauracion.md` documenta `mysqldump` completo, estructura y datos. |
| Restauracion | `03_respaldo_restauracion.md` incluye restauracion en base alterna. |
| Consistencia recuperada | `03_respaldo_restauracion.md` y `06_pruebas_integrales.sql` incluyen consultas de comprobacion. |
| BEGIN, COMMIT, ROLLBACK | Backend usa transacciones en ventas y eliminacion de plantas. `04_procedimientos_almacenados.sql` y `06_pruebas_integrales.sql` demuestran `START TRANSACTION`, `COMMIT`, `ROLLBACK`. |
| ACID | Ventas y eliminacion de plantas se realizan de forma atomica; si falla un paso se revierte la operacion. |
| Fallos y recuperacion | `06_pruebas_integrales.sql` contiene rollback manual y prueba de fallo por trigger. |
| Procedimientos almacenados | `04_procedimientos_almacenados.sql` define `sp_reporte_ventas_diario`, `sp_registrar_venta_simple` y `sp_recalcular_totales_ventas`. |
| Parametros | Los procedimientos usan parametros `IN` y `OUT`. |
| Variables | Los procedimientos declaran variables con `DECLARE`. |
| IF, CASE, ciclos | `sp_registrar_venta_simple` usa `IF` y `CASE`; `sp_recalcular_totales_ventas` usa cursor y `LOOP`. |
| Trigger correcto | `05_triggers_auditoria_validaciones.sql` define triggers `BEFORE UPDATE`, `BEFORE INSERT`, `AFTER INSERT` y `AFTER DELETE`. |
| BEFORE/AFTER | Se usan segun el objetivo: validacion antes de insertar/actualizar, auditoria despues de insertar/eliminar. |
| Automatizacion | Los triggers validan reglas y registran auditoria automaticamente. |
| Tablas logicas | En MySQL se usan `NEW` y `OLD`, equivalentes funcionales a registros logicos del evento. |
| Pruebas de procedimiento y trigger | `06_pruebas_integrales.sql`. |
| Explicacion de resultados | Esta matriz explica que valida cada archivo. |
| Caratula, indice, introduccion, conclusiones e imagenes | Usar `modelo_conceptual_logico.md` como base; incluye diagrama ER en Mermaid que puede exportarse como imagen. |

## Proyecto integrador

| Criterio | Evidencia |
|---|---|
| Diseno conceptual y logico | `modelo_conceptual_logico.md`. |
| Creacion e implementacion | `01_schema_referencia.sql` y backend NestJS conectado a MySQL. |
| Conexion a base de datos | `backend/src/database/database.service.ts` usa pool MySQL con variables de entorno. |
| Administracion, seguridad y mantenimiento | `02_seguridad_roles_permisos.sql`, `03_respaldo_restauracion.md`. |
| Pruebas, funcionamiento y documentacion | `06_pruebas_integrales.sql`, esta matriz y la app funcional. |

## Riesgos, errores y mejoras posibles

- Riesgo: eliminar plantas con ventas borra historial asociado. Mejora: implementar baja logica con campo `activo` para ocultar sin borrar.
- Riesgo: credenciales locales expuestas en scripts de ejemplo. Mejora: usar variables de entorno y rotacion de contrasenas.
- Riesgo: respaldos manuales pueden olvidarse. Mejora: automatizar `mysqldump` diario con el programador de tareas.
- Riesgo: permisos excesivos en desarrollo. Mejora: usar usuarios separados para backend, reportes y administracion.
- Riesgo: triggers no sustituyen validaciones de frontend/backend. Mejora: mantener validacion en las tres capas.

## Conclusion

Stock Bloom cumple los requisitos centrales de la rubrica porque integra una aplicacion real conectada a MySQL con catalogo, inventario, ventas, produccion, usuarios, permisos, reportes, transacciones, respaldo/restauracion, procedimientos almacenados, triggers y pruebas documentadas.
