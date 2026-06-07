import { Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateProductionDto } from './dto/create-production.dto';

@Injectable()
export class ProductionService implements OnModuleInit {
  constructor(private readonly db: DatabaseService) {}

  async onModuleInit() {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS produccion (
        id_produccion INT AUTO_INCREMENT PRIMARY KEY,
        id_planta INT NOT NULL,
        cantidad INT NOT NULL,
        fecha_siembra DATE NOT NULL,
        fecha_cosecha DATE,
        observaciones TEXT,
        FOREIGN KEY (id_planta) REFERENCES planta(id_planta) ON DELETE CASCADE
      )
    `);
  }

  async registrarProduccion(payload: CreateProductionDto) {
    await this.db.query(
      'INSERT INTO produccion (id_planta, cantidad, fecha_siembra, fecha_cosecha, observaciones) VALUES (?, ?, ?, ?, ?)',
      [payload.id_planta, payload.cantidad, payload.fecha_siembra, payload.fecha_cosecha, 'Lote del invernadero'],
    );

    return { success: true, message: 'Lote registrado correctamente' };
  }

  async listarProduccion() {
    const [rows] = await this.db.query(`
      SELECT p.*, pl.nombre_comun
      FROM produccion p
      JOIN planta pl ON p.id_planta = pl.id_planta
      ORDER BY p.id_produccion DESC
    `);
    return rows;
  }
}
