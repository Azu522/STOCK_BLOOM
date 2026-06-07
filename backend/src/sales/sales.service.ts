import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(private readonly db: DatabaseService) {}

  private formatLocalDateTime(date = new Date()) {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  private getFechaConsulta(fecha?: string) {
    if (fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
    return this.formatLocalDateTime().slice(0, 10);
  }

  private getRangoFechas(inicio?: string, fin?: string) {
    const hoy = this.formatLocalDateTime().slice(0, 10);
    const fechaInicio = inicio && /^\d{4}-\d{2}-\d{2}$/.test(inicio) ? inicio : hoy;
    const fechaFin = fin && /^\d{4}-\d{2}-\d{2}$/.test(fin) ? fin : fechaInicio;

    return { fechaInicio, fechaFin };
  }

  async registrarVenta(payload: CreateSaleDto) {
    const fechaFormateada =
      payload.fecha && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(payload.fecha)
          ? payload.fecha
          : payload.fecha
            ? new Date(payload.fecha).toISOString().slice(0, 19).replace('T', ' ')
            : this.formatLocalDateTime();

    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();
      const [resultVenta] = await connection.query(
        'INSERT INTO venta (fecha, total, id_usuario) VALUES (?, ?, ?)',
        [fechaFormateada, payload.total, payload.id_usuario],
      );
      const idVenta = (resultVenta as any).insertId;

      for (const item of payload.detalles) {
        await connection.query(
          'INSERT INTO detalle_venta (id_venta, id_planta, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
          [idVenta, item.id_planta, item.cantidad, item.precio_unitario, item.subtotal],
        );
        await connection.query('UPDATE planta SET stock = stock - ? WHERE id_planta = ?', [
          item.cantidad,
          item.id_planta,
        ]);
      }

      await connection.commit();
      return { success: true, message: 'Venta registrada con exito', id_venta: idVenta };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async listarVentasPorDia(fecha?: string) {
    const fechaConsulta = this.getFechaConsulta(fecha);
    const [ventas] = await this.db.query(
      `SELECT v.id_venta, v.fecha, v.total, v.id_usuario,
        TRIM(CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellidoP, ''))) AS cajero
       FROM venta v
       LEFT JOIN usuario u ON v.id_usuario = u.id_usuario
       WHERE DATE(v.fecha) = ?
       ORDER BY v.fecha DESC`,
      [fechaConsulta],
    );

    if (ventas.length === 0) {
      return {
        fecha: fechaConsulta,
        resumen: { totalVentas: 0, totalImporte: 0, totalUnidades: 0 },
        ventas: [],
      };
    }

    const ids = ventas.map((venta) => venta.id_venta);
    const [detalles] = await this.db.query(
      `SELECT dv.id_venta, dv.id_planta, p.nombre_comun, dv.cantidad, dv.precio_unitario, dv.subtotal
       FROM detalle_venta dv
       INNER JOIN planta p ON dv.id_planta = p.id_planta
       WHERE dv.id_venta IN (${ids.map(() => '?').join(',')})
       ORDER BY dv.id_venta DESC, p.nombre_comun ASC`,
      ids,
    );

    const detallesPorVenta = new Map<number, any[]>();
    detalles.forEach((detalle) => {
      const idVenta = Number(detalle.id_venta);
      if (!detallesPorVenta.has(idVenta)) detallesPorVenta.set(idVenta, []);
      detallesPorVenta.get(idVenta).push(detalle);
    });

    const ventasConDetalle = ventas.map((venta) => ({
      ...venta,
      total: Number(venta.total || 0),
      detalles: detallesPorVenta.get(Number(venta.id_venta)) || [],
    }));

    const totalImporte = ventasConDetalle.reduce((sum, venta) => sum + Number(venta.total || 0), 0);
    const totalUnidades = detalles.reduce((sum, detalle) => sum + Number(detalle.cantidad || 0), 0);

    return {
      fecha: fechaConsulta,
      resumen: {
        totalVentas: ventasConDetalle.length,
        totalImporte,
        totalUnidades,
      },
      ventas: ventasConDetalle,
    };
  }

  async listarVentasPorEmpleado(inicio?: string, fin?: string) {
    const { fechaInicio, fechaFin } = this.getRangoFechas(inicio, fin);

    const [rows] = await this.db.query(
      `SELECT
        u.id_usuario,
        TRIM(CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellidoP, ''), ' ', COALESCE(u.apellidoM, ''))) AS empleado,
        u.rol,
        COUNT(v.id_venta) AS total_ventas,
        COALESCE(SUM(vu.total_unidades), 0) AS total_unidades,
        COALESCE(SUM(v.total), 0) AS total_importe
       FROM usuario u
       LEFT JOIN venta v ON u.id_usuario = v.id_usuario AND DATE(v.fecha) BETWEEN ? AND ?
       LEFT JOIN (
         SELECT id_venta, SUM(cantidad) AS total_unidades
         FROM detalle_venta
         GROUP BY id_venta
       ) vu ON v.id_venta = vu.id_venta
       GROUP BY u.id_usuario, empleado, u.rol
       ORDER BY total_importe DESC, empleado ASC`,
      [fechaInicio, fechaFin],
    );

    const totalVentas = rows.reduce((sum, row) => sum + Number(row.total_ventas || 0), 0);
    const totalUnidades = rows.reduce((sum, row) => sum + Number(row.total_unidades || 0), 0);
    const totalImporte = rows.reduce((sum, row) => sum + Number(row.total_importe || 0), 0);

    return {
      inicio: fechaInicio,
      fin: fechaFin,
      resumen: { totalVentas, totalUnidades, totalImporte },
      empleados: rows.map((row) => ({
        ...row,
        total_ventas: Number(row.total_ventas || 0),
        total_unidades: Number(row.total_unidades || 0),
        total_importe: Number(row.total_importe || 0),
      })),
    };
  }
}
