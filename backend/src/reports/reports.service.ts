import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument = require('pdfkit');
import { DatabaseService } from '../database/database.service';

const formatCurrency = (value: number) => `$${Number(value || 0).toFixed(2)}`;

const formatDate = (date: Date) =>
  date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const formatMonthYear = (date: Date) => {
  const value = date.toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  private getReporteConfig(tipo: string, filtros: Record<string, string>) {
    const hoy = new Date();
    const anioSeleccionado = Number(filtros.anio) || hoy.getFullYear();

    if (tipo === 'diario') {
      const partesFecha = String(filtros.fecha || '').split('-').map(Number);
      const fechaSeleccionada =
        partesFecha.length === 3 && partesFecha.every((parte) => Number.isFinite(parte))
          ? new Date(partesFecha[0], partesFecha[1] - 1, partesFecha[2])
          : hoy;
      const inicio = startOfDay(fechaSeleccionada);
      const fin = endOfDay(fechaSeleccionada);

      return {
        titulo: 'Reporte Diario',
        subtitulo: formatDate(fechaSeleccionada),
        periodo: formatDate(fechaSeleccionada),
        fechaSql: fechaSeleccionada.toISOString().slice(0, 10),
        inicio,
        fin,
        esDiario: true,
      };
    }

    if (tipo === 'mensual') {
      const mesSeleccionado = Math.min(Math.max(Number(filtros.mes) || hoy.getMonth() + 1, 1), 12);
      const fechaPeriodo = new Date(anioSeleccionado, mesSeleccionado - 1, 1);
      const inicio = new Date(anioSeleccionado, mesSeleccionado - 1, 1, 0, 0, 0);
      const fin = new Date(anioSeleccionado, mesSeleccionado, 0, 23, 59, 59);

      return {
        titulo: 'Reporte Mensual',
        subtitulo: formatMonthYear(fechaPeriodo),
        periodo: `${formatDate(inicio)} al ${formatDate(fin)}`,
        inicio,
        fin,
      };
    }

    if (tipo === 'anual') {
      const inicio = new Date(anioSeleccionado, 0, 1, 0, 0, 0);
      const fin = new Date(anioSeleccionado, 11, 31, 23, 59, 59);

      return {
        titulo: 'Reporte Anual',
        subtitulo: String(anioSeleccionado),
        periodo: `${formatDate(inicio)} al ${formatDate(fin)}`,
        inicio,
        fin,
        esAnual: true,
      };
    }

    const inicio = startOfDay(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 6));
    const fin = endOfDay(hoy);

    return {
      titulo: 'Reporte Semanal',
      subtitulo: `${formatDate(inicio)} al ${formatDate(fin)}`,
      periodo: `${formatDate(inicio)} al ${formatDate(fin)}`,
      inicio,
      fin,
    };
  }

  private drawInfoCard(doc: PDFKit.PDFDocument, x: number, y: number, width: number, label: string, value: string, fillColor: string) {
    doc.roundedRect(x, y, width, 62, 8).fill(fillColor);
    doc.fillColor('#4F6B3A').font('Helvetica-Bold').fontSize(9).text(label, x + 12, y + 12, {
      width: width - 24,
    });
    doc.fillColor('#2E5E3E').font('Helvetica-Bold').fontSize(17).text(value, x + 12, y + 30, {
      width: width - 24,
      ellipsis: true,
    });
  }

  private drawReporteHeader(doc: PDFKit.PDFDocument, config: any) {
    const logoPath = path.join(process.cwd(), 'logo.jpeg');

    doc.rect(0, 0, 595.28, 112).fill('#2E5E3E');
    doc.fillColor('#FFF8E5').font('Helvetica-Bold').fontSize(22).text('STOCK BLOOM', 140, 34);
    doc.fillColor('#D6E9CD').font('Helvetica').fontSize(11).text('Invernadero George el curioso', 140, 62);
    doc.fillColor('#FFE79A').font('Helvetica-Bold').fontSize(10).text(config.subtitulo.toUpperCase(), 140, 82);

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 26, { width: 72, height: 72 });
    } else {
      doc.roundedRect(40, 26, 72, 72, 10).fill('#FFF8E5');
    }

    doc.fillColor('#FFF8E5').font('Helvetica-Bold').fontSize(15).text(config.titulo, 350, 38, {
      width: 190,
      align: 'right',
    });
    doc.fillColor('#D6E9CD').font('Helvetica').fontSize(9).text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, 390, 65, {
      width: 150,
      align: 'right',
    });
    doc.fillColor('#FFF8E5').font('Helvetica-Bold').fontSize(8).text(`Periodo: ${config.periodo}`, 330, 84, {
      width: 210,
      align: 'right',
    });
  }

  private drawTableHeader(doc: PDFKit.PDFDocument, y: number) {
    doc.roundedRect(40, y, 515, 28, 6).fill('#2E5E3E');
    doc.fillColor('#FFF8E5').font('Helvetica-Bold').fontSize(9);
    doc.text('Planta', 52, y + 9, { width: 190 });
    doc.text('Vendidas', 250, y + 9, { width: 60, align: 'right' });
    doc.text('Ingreso', 330, y + 9, { width: 80, align: 'right' });
    doc.text('Stock final', 430, y + 9, { width: 80, align: 'right' });
  }

  private drawMonthlyHeader(doc: PDFKit.PDFDocument, y: number) {
    doc.roundedRect(40, y, 515, 28, 6).fill('#4F6B3A');
    doc.fillColor('#FFF8E5').font('Helvetica-Bold').fontSize(9);
    doc.text('Mes', 52, y + 9, { width: 190 });
    doc.text('Unidades', 270, y + 9, { width: 70, align: 'right' });
    doc.text('Ingreso', 390, y + 9, { width: 100, align: 'right' });
  }

  private getRangoEmpleados(filtros: Record<string, string>) {
    const hoy = new Date();
    const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const inicio = /^\d{4}-\d{2}-\d{2}$/.test(filtros.inicio || '') ? filtros.inicio : fechaHoy;
    const fin = /^\d{4}-\d{2}-\d{2}$/.test(filtros.fin || '') ? filtros.fin : inicio;
    return { inicio, fin };
  }

  private drawEmployeeHeader(doc: PDFKit.PDFDocument, y: number) {
    doc.roundedRect(40, y, 515, 28, 6).fill('#2E5E3E');
    doc.fillColor('#FFF8E5').font('Helvetica-Bold').fontSize(9);
    doc.text('Empleado', 52, y + 9, { width: 190 });
    doc.text('Ventas', 250, y + 9, { width: 60, align: 'right' });
    doc.text('Unidades', 325, y + 9, { width: 70, align: 'right' });
    doc.text('Importe', 430, y + 9, { width: 80, align: 'right' });
  }

  private drawEmployeePlantHeader(doc: PDFKit.PDFDocument, y: number) {
    doc.roundedRect(40, y, 515, 28, 6).fill('#2E5E3E');
    doc.fillColor('#FFF8E5').font('Helvetica-Bold').fontSize(9);
    doc.text('Planta vendida', 52, y + 9, { width: 180 });
    doc.text('Tickets', 250, y + 9, { width: 60, align: 'right' });
    doc.text('Unidades', 325, y + 9, { width: 70, align: 'right' });
    doc.text('Importe', 430, y + 9, { width: 80, align: 'right' });
  }

  private async descargarReporteEmpleados(filtros: Record<string, string>, res: any) {
    const rango = this.getRangoEmpleados(filtros);
    const inicioDate = new Date(`${rango.inicio}T00:00:00`);
    const finDate = new Date(`${rango.fin}T00:00:00`);
    const idUsuario = filtros.id_usuario ? Number(filtros.id_usuario) : null;
const filtroUsuarioSql = idUsuario
  ? 'WHERE u.id_usuario = ?'
  : 'WHERE u.activo = 1';
    const parametrosUsuarios = idUsuario ? [rango.inicio, rango.fin, idUsuario] : [rango.inicio, rango.fin];

    const [rows] = await this.db.query(
      `SELECT
        u.id_usuario,
        TRIM(CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellidoP, ''), ' ', COALESCE(u.apellidoM, ''))) AS empleado,
        u.rol,
        COUNT(v.id_venta) AS total_ventas,
        COALESCE(SUM(vu.total_unidades), 0) AS total_unidades,
        COALESCE(SUM(v.total), 0) AS total_importe
        FROM usuario u
        ${idUsuario ? 'LEFT JOIN' : 'INNER JOIN'} venta v ON u.id_usuario = v.id_usuario AND DATE(v.fecha) BETWEEN ? AND ?
        LEFT JOIN (
        SELECT id_venta, SUM(cantidad) AS total_unidades
        FROM detalle_venta
        GROUP BY id_venta
       ) vu ON v.id_venta = vu.id_venta
       ${filtroUsuarioSql}
       GROUP BY u.id_usuario, empleado, u.rol
       ORDER BY total_importe DESC, empleado ASC`,
      parametrosUsuarios,
    );

    const totalImporte = rows.reduce((sum, row) => sum + Number(row.total_importe || 0), 0);
    const totalVentas = rows.reduce((sum, row) => sum + Number(row.total_ventas || 0), 0);
    const totalUnidades = rows.reduce((sum, row) => sum + Number(row.total_unidades || 0), 0);
    const empleadosActivos = rows.filter((row) => Number(row.total_ventas || 0) > 0).length;
    let plantasVendidas = [];

    if (idUsuario) {
      const [plantas] = await this.db.query(
        `SELECT
          p.nombre_comun,
          COUNT(DISTINCT v.id_venta) AS total_ventas,
          COALESCE(SUM(dv.cantidad), 0) AS total_unidades,
          COALESCE(SUM(dv.subtotal), 0) AS total_importe
         FROM venta v
         INNER JOIN detalle_venta dv ON v.id_venta = dv.id_venta
         INNER JOIN planta p ON dv.id_planta = p.id_planta
         WHERE v.id_usuario = ? AND DATE(v.fecha) BETWEEN ? AND ?
         GROUP BY p.id_planta, p.nombre_comun
         ORDER BY total_importe DESC, p.nombre_comun ASC`,
        [idUsuario, rango.inicio, rango.fin],
      );
      plantasVendidas = plantas;
    }

    res.setHeader('Content-Type', 'application/pdf');
    const nombreArchivo = idUsuario
      ? `Reporte_ventas_empleado_${idUsuario}_${rango.inicio}_${rango.fin}.pdf`
      : `Reporte_ventas_empleados_${rango.inicio}_${rango.fin}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);

    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
    doc.pipe(res);

    this.drawReporteHeader(doc, {
      titulo: idUsuario ? 'Ventas del empleado' : 'Ventas por empleado',
      subtitulo: `${formatDate(inicioDate)} al ${formatDate(finDate)}`,
      periodo: `${formatDate(inicioDate)} al ${formatDate(finDate)}`,
    });

    this.drawInfoCard(doc, 40, 136, 120, 'INGRESOS', formatCurrency(totalImporte), '#FFF2CC');
    this.drawInfoCard(doc, 172, 136, 120, 'VENTAS', String(totalVentas), '#D6E9CD');
    this.drawInfoCard(doc, 304, 136, 120, 'UNIDADES', String(totalUnidades), '#CDE6F2');
    this.drawInfoCard(doc, 436, 136, 119, 'EMPLEADOS', String(empleadosActivos), '#FFE79A');

    let y = 226;
    const empleadoSeleccionado = rows[0]?.empleado || 'Empleado';
    doc
      .fillColor('#2E5E3E')
      .font('Helvetica-Bold')
      .fontSize(14)
      .text(idUsuario ? `Detalle de plantas vendidas por ${empleadoSeleccionado}` : 'Detalle por empleado', 40, y);
    doc
      .fillColor('#4F6B3A')
      .font('Helvetica')
      .fontSize(9)
      .text(
        idUsuario
          ? 'Productos vendidos por el colaborador dentro del periodo seleccionado.'
          : 'Ordenado por mayor importe vendido dentro del periodo seleccionado.',
        40,
        y + 20,
      );
    y += 48;
    if (idUsuario) {
      this.drawEmployeePlantHeader(doc, y);
    } else {
      this.drawEmployeeHeader(doc, y);
    }
    y += 38;

    const tableRows = idUsuario ? plantasVendidas : rows;

    if (tableRows.length === 0) {
      doc.roundedRect(40, y, 515, 70, 8).fill('#FFF8E5');
      doc.fillColor('#4F6B3A').font('Helvetica-Bold').fontSize(11).text(idUsuario ? 'Este usuario no tiene plantas vendidas en el periodo.' : 'No hay empleados para mostrar.', 60, y + 26, {
        width: 475,
        align: 'center',
      });
    } else {
      tableRows.forEach((row, index) => {
        if (y > 704) {
          doc.addPage();
          y = 60;
          if (idUsuario) {
            this.drawEmployeePlantHeader(doc, y);
          } else {
            this.drawEmployeeHeader(doc, y);
          }
          y += 38;
        }

        const fill = index % 2 === 0 ? '#FFFFFF' : '#FFF8E5';
        doc.rect(40, y - 8, 515, 30).fill(fill);
        doc
          .fillColor('#2E5E3E')
          .font('Helvetica-Bold')
          .fontSize(9)
          .text(idUsuario ? row.nombre_comun || 'Sin nombre' : row.empleado || 'Sin nombre', 52, y, { width: idUsuario ? 180 : 190 });
        doc
          .fillColor('#304B2D')
          .font('Helvetica')
          .fontSize(9)
          .text(String(row.total_ventas || 0), 250, y, { width: 60, align: 'right' })
          .text(String(row.total_unidades || 0), 325, y, { width: 70, align: 'right' })
          .text(formatCurrency(row.total_importe), 430, y, { width: 80, align: 'right' });

        y += 30;
      });
    }

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      this.drawFooter(doc, i + 1, pages.count);
    }

    doc.end();
  }

  private drawFooter(doc: PDFKit.PDFDocument, pageNumber: number, pageTotal: number) {
    const y = 744;
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#D6E9CD').stroke();
    doc
      .fillColor('#4F6B3A')
      .font('Helvetica')
      .fontSize(8)
      .text('Stock Bloom - Reporte generado automaticamente', 40, y + 12, { width: 260 })
      .text(`Pagina ${pageNumber} de ${pageTotal}`, 430, y + 12, { width: 125, align: 'right' });
  }

  async descargarReporte(tipo: string, filtros: Record<string, string>, res: any) {
    if (tipo === 'empleados') {
      return this.descargarReporteEmpleados(filtros, res);
    }

    const config = this.getReporteConfig(tipo, filtros);

    const query = `
      SELECT p.nombre_comun,
      SUM(dv.cantidad) as total_vendido,
      SUM(dv.subtotal) as total_ingreso,
      MAX(p.stock) as stock_final
      FROM detalle_venta dv
      INNER JOIN venta v ON dv.id_venta = v.id_venta
      INNER JOIN planta p ON dv.id_planta = p.id_planta
      WHERE ${(config as any).esDiario ? 'DATE(v.fecha) = ?' : 'v.fecha BETWEEN ? AND ?'}
      GROUP BY p.id_planta, p.nombre_comun
      ORDER BY total_ingreso DESC`;

    const [rows] = await this.db.query(query, (config as any).esDiario ? [(config as any).fechaSql] : [config.inicio, config.fin]);
    let resumenMensual = [];

    if ((config as any).esAnual) {
      const [mensuales] = await this.db.query(
        `
        SELECT MONTH(v.fecha) as mes,
        SUM(dv.cantidad) as total_vendido,
        SUM(dv.subtotal) as total_ingreso
        FROM detalle_venta dv
        INNER JOIN venta v ON dv.id_venta = v.id_venta
        WHERE v.fecha BETWEEN ? AND ?
        GROUP BY MONTH(v.fecha)
        ORDER BY mes ASC`,
        [config.inicio, config.fin],
      );
      const porMes = new Map(mensuales.map((row) => [Number(row.mes), row]));
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

      resumenMensual = meses.map((nombre, index) => {
        const data: any = porMes.get(index + 1) || {};
        return {
          mes: nombre,
          total_vendido: Number(data.total_vendido || 0),
          total_ingreso: Number(data.total_ingreso || 0),
        };
      });
    }

    const totalRecaudado = rows.reduce((sum, row) => sum + Number(row.total_ingreso || 0), 0);
    const totalUnidades = rows.reduce((sum, row) => sum + Number(row.total_vendido || 0), 0);
    const productosVendidos = rows.length;
    const stockFinal = rows.reduce((sum, row) => sum + Number(row.stock_final || 0), 0);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Reporte_${tipo}.pdf`);

    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
    doc.pipe(res);

    this.drawReporteHeader(doc, config);
    this.drawInfoCard(doc, 40, 136, 120, 'INGRESOS', formatCurrency(totalRecaudado), '#FFF2CC');
    this.drawInfoCard(doc, 172, 136, 120, 'UNIDADES', String(totalUnidades), '#D6E9CD');
    this.drawInfoCard(doc, 304, 136, 120, 'PRODUCTOS', String(productosVendidos), '#CDE6F2');
    this.drawInfoCard(doc, 436, 136, 119, 'STOCK FINAL', String(stockFinal), '#FFE79A');

    let y = 226;

    if ((config as any).esAnual) {
      doc.fillColor('#2E5E3E').font('Helvetica-Bold').fontSize(14).text('Resumen mensual', 40, y);
      doc.fillColor('#4F6B3A').font('Helvetica').fontSize(9).text('Ventas divididas por mes dentro del anio seleccionado.', 40, y + 20);
      y += 48;
      this.drawMonthlyHeader(doc, y);
      y += 38;

      resumenMensual.forEach((row, index) => {
        const fill = index % 2 === 0 ? '#FFFFFF' : '#FFF8E5';
        doc.rect(40, y - 8, 515, 28).fill(fill);
        doc.fillColor('#2E5E3E').font('Helvetica-Bold').fontSize(9).text(row.mes, 52, y, { width: 190 });
        doc
          .fillColor('#304B2D')
          .font('Helvetica')
          .fontSize(9)
          .text(String(row.total_vendido), 270, y, { width: 70, align: 'right' })
          .text(formatCurrency(row.total_ingreso), 390, y, { width: 100, align: 'right' });
        y += 28;
      });

      y += 22;
      if (y > 650) {
        doc.addPage();
        y = 60;
      }
    }

    doc.fillColor('#2E5E3E').font('Helvetica-Bold').fontSize(14).text('Detalle por planta', 40, y);
    doc.fillColor('#4F6B3A').font('Helvetica').fontSize(9).text('Ordenado por mayor ingreso generado durante el periodo seleccionado.', 40, y + 20);
    y += 48;
    this.drawTableHeader(doc, y);
    y += 38;

    if (rows.length === 0) {
      doc.roundedRect(40, y, 515, 70, 8).fill('#FFF8E5');
      doc.fillColor('#4F6B3A').font('Helvetica-Bold').fontSize(11).text('No hay ventas registradas para este periodo.', 60, y + 26, {
        width: 475,
        align: 'center',
      });
    } else {
      rows.forEach((row, index) => {
        if (y > 704) {
          doc.addPage();
          y = 60;
          this.drawTableHeader(doc, y);
          y += 38;
        }

        const fill = index % 2 === 0 ? '#FFFFFF' : '#FFF8E5';
        doc.rect(40, y - 8, 515, 30).fill(fill);
        doc.fillColor('#2E5E3E').font('Helvetica-Bold').fontSize(9).text(row.nombre_comun || 'Sin nombre', 52, y, { width: 190 });
        doc
          .fillColor('#304B2D')
          .font('Helvetica')
          .fontSize(9)
          .text(String(row.total_vendido || 0), 250, y, { width: 60, align: 'right' })
          .text(formatCurrency(row.total_ingreso), 330, y, { width: 80, align: 'right' })
          .text(String(row.stock_final || 0), 430, y, { width: 80, align: 'right' });

        y += 30;
      });
    }

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      this.drawFooter(doc, i + 1, pages.count);
    }

    doc.end();
  }
}
