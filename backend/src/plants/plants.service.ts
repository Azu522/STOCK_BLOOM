import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreatePlantDto } from './dto/create-plant.dto';

@Injectable()
export class PlantsService {
  private categoryColumnName: string | null = null;

  constructor(private readonly db: DatabaseService) {}

  private escapeIdentifier(identifier: string) {
    return this.db.escapeIdentifier(identifier);
  }

  private async getCategoryColumn() {
    if (this.categoryColumnName) return this.categoryColumnName;

    const [columns] = await this.db.query('SHOW COLUMNS FROM planta');
    const fields = columns.map((column) => String(column.Field));
    const categoryColumn = fields.find((field) => field.toLowerCase().startsWith('categor'));

    if (!categoryColumn) {
      throw new Error('No se encontro una columna de categoria en la tabla planta.');
    }

    this.categoryColumnName = categoryColumn;
    return categoryColumn;
  }

  async listarPlantas() {
    const categoryColumn = await this.getCategoryColumn();
    const [rows] = await this.db.query(
      `SELECT id_planta, nombre_comun, nombre_cientifico, stock, ambiente, temporada, ${this.escapeIdentifier(categoryColumn)} AS categoria, precio_mayoreo, precio_menudeo, descripcion FROM planta`,
    );
    return rows;
  }

  async registrarPlanta(payload: CreatePlantDto) {
    const categoryColumn = await this.getCategoryColumn();
    const [plantasDuplicadas] = await this.db.query(
      'SELECT id_planta FROM planta WHERE LOWER(TRIM(nombre_comun)) = LOWER(TRIM(?)) LIMIT 1',
      [payload.nombre_comun],
    );

    if (plantasDuplicadas.length > 0) {
      return {
        success: false,
        error: `La planta "${payload.nombre_comun}" ya se encuentra registrada en el catalogo.`,
      };
    }

    const [result] = await this.db.query(
      `INSERT INTO planta (nombre_comun, nombre_cientifico, stock, ambiente, temporada, ${this.escapeIdentifier(categoryColumn)}, precio_mayoreo, precio_menudeo, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.nombre_comun,
        payload.nombre_cientifico || '',
        payload.stock,
        payload.ambiente,
        payload.temporada,
        payload.categoria,
        payload.precio_mayoreo,
        payload.precio_menudeo,
        payload.descripcion || '',
      ],
    );

    return { success: true, id_planta: result.insertId };
  }

  async actualizarPlanta(idPlanta: string, payload: CreatePlantDto) {
    const categoryColumn = await this.getCategoryColumn();
    const [plantasDuplicadas] = await this.db.query(
      'SELECT id_planta FROM planta WHERE LOWER(TRIM(nombre_comun)) = LOWER(TRIM(?)) AND id_planta <> ? LIMIT 1',
      [payload.nombre_comun, idPlanta],
    );

    if (plantasDuplicadas.length > 0) {
      return {
        success: false,
        error: `Ya existe otra planta registrada con el nombre "${payload.nombre_comun}".`,
      };
    }

    await this.db.query(
      `UPDATE planta SET nombre_comun = ?, nombre_cientifico = ?, stock = ?, ambiente = ?, temporada = ?, ${this.escapeIdentifier(categoryColumn)} = ?, precio_mayoreo = ?, precio_menudeo = ?, descripcion = ? WHERE id_planta = ?`,
      [
        payload.nombre_comun,
        payload.nombre_cientifico || '',
        payload.stock,
        payload.ambiente,
        payload.temporada,
        payload.categoria,
        payload.precio_mayoreo,
        payload.precio_menudeo,
        payload.descripcion || '',
        idPlanta,
      ],
    );

    return { success: true, message: 'Planta actualizada correctamente' };
  }

  async eliminarPlanta(idPlanta: string) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      const [ventasRelacionadas] = await connection.query(
        'SELECT DISTINCT id_venta FROM detalle_venta WHERE id_planta = ?',
        [idPlanta],
      );

      await connection.query('DELETE FROM produccion WHERE id_planta = ?', [idPlanta]);
      await connection.query('DELETE FROM detalle_venta WHERE id_planta = ?', [idPlanta]);

      for (const venta of ventasRelacionadas as any[]) {
        const idVenta = venta.id_venta;
        const [resumenVenta] = await connection.query(
          'SELECT COUNT(*) AS total_detalles, COALESCE(SUM(subtotal), 0) AS nuevo_total FROM detalle_venta WHERE id_venta = ?',
          [idVenta],
        );
        const resumen = (resumenVenta as any[])[0];

        if (Number(resumen.total_detalles || 0) === 0) {
          await connection.query('DELETE FROM venta WHERE id_venta = ?', [idVenta]);
        } else {
          await connection.query('UPDATE venta SET total = ? WHERE id_venta = ?', [
            Number(resumen.nuevo_total || 0),
            idVenta,
          ]);
        }
      }

      const [result] = await connection.query('DELETE FROM planta WHERE id_planta = ?', [idPlanta]);

      if ((result as any).affectedRows === 0) {
        await connection.rollback();
        return { success: false, statusCode: 404, error: 'La planta no existe o ya fue eliminada.' };
      }

      await connection.commit();
      return { success: true, message: 'Planta y movimientos relacionados eliminados correctamente' };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}
