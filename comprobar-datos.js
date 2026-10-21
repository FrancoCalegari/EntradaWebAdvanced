require('dotenv').config();
const db = require('./services/database');

async function main() {
  try {
    const eventos = await db.query('SELECT COUNT(*) AS cantidad FROM eventos');
    const entradas = await db.query('SELECT COUNT(*) AS cantidad FROM entradas');

    console.log('Eventos:', JSON.stringify(eventos.result));
    console.log('Entradas:', JSON.stringify(entradas.result));
  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  }
}

main();
