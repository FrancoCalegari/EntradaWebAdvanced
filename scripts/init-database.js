// Aplica el esquema local a la base configurada en Spider-Web.

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const databaseService = require('../services/database');

function separarSentencias(sql) {
  return sql
    .split(/;\s*(?=CREATE TABLE|$)/i)
    .map((sentencia) => sentencia.replace(/--.*$/gm, '').trim())
    .filter(Boolean);
}

async function inicializarBaseDeDatos() {
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const sentencias = separarSentencias(schema);

  for (let indice = 0; indice < sentencias.length; indice += 1) {
    await databaseService.query(sentencias[indice]);
    console.log(`Sentencia ${indice + 1}/${sentencias.length} aplicada`);
  }

  const tablas = await databaseService.query('SHOW TABLES');
  console.log('Esquema aplicado correctamente. Tablas:', tablas.result || []);
}

inicializarBaseDeDatos().catch((error) => {
  console.error('No se pudo aplicar el esquema:', error.message);
  process.exitCode = 1;
});