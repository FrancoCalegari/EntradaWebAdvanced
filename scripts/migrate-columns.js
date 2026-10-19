// scripts/migrate-columns.js
// Agrega de forma segura las columnas necesarias a la tabla eventos si no existen.

require('dotenv').config();
const databaseService = require('../services/database');

async function migrarColumnas() {
  try {
    const desc = await databaseService.query('DESCRIBE eventos');
    const existingCols = (desc.result || []).map((c) => c.Field);

    console.log('Columnas actuales en eventos:', existingCols);

    const columnasNecesarias = [
      { name: 'imagen', def: 'VARCHAR(500) NULL' },
      { name: 'categoria', def: 'VARCHAR(50) NULL' },
      { name: 'precio_min', def: 'DECIMAL(10, 2) NOT NULL DEFAULT 0' },
      { name: 'estado', def: "ENUM('disponible', 'agotado', 'proximo', 'cancelado') NOT NULL DEFAULT 'disponible'" },
    ];

    for (const col of columnasNecesarias) {
      if (!existingCols.includes(col.name)) {
        console.log(`Agregando columna ${col.name}...`);
        await databaseService.query(`ALTER TABLE eventos ADD COLUMN ${col.name} ${col.def}`);
        console.log(`✅ Columna ${col.name} agregada.`);
      } else {
        console.log(`ℹ️ Columna ${col.name} ya existe.`);
      }
    }

    const descFinal = await databaseService.query('DESCRIBE eventos');
    console.log('Columnas finales en eventos:', (descFinal.result || []).map((c) => c.Field));
  } catch (error) {
    console.error('Error durante la migración:', error.message);
    process.exitCode = 1;
  }
}

migrarColumnas();
