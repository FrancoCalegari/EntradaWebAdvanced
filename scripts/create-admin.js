// scripts/create-admin.js
// Script seguro para crear o actualizar un usuario administrador con contrase├▒a hasheada (bcrypt).
// No hardcodea credenciales: las toma de variables de entorno, argumentos CLI o prompt interactivo.
//
// Uso:
//   node scripts/create-admin.js
//   node scripts/create-admin.js --email=admin@example.com --password=TU_PASSWORD --name="Administrador Principal"
//   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=TU_PASSWORD node scripts/create-admin.js

require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcryptjs');
const databaseService = require('../services/database');

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith('--')) {
      const [key, ...vals] = arg.slice(2).split('=');
      args[key] = vals.join('=');
    }
  });
  return args;
}

function prompt(pregunta, hidden = false) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(pregunta, (respuesta) => {
      rl.close();
      resolve(respuesta.trim());
    });
  });
}

async function main() {
  try {
    console.log('=== Generador Seguro de Administrador EntradaWeb ===\n');

    const args = parseArgs();

    const email = (
      args.email ||
      process.env.ADMIN_EMAIL ||
      (await prompt('Email del administrador: '))
    ).trim().toLowerCase();

    if (!email || !email.includes('@')) {
      console.error('ÔØî Error: El email proporcionado no es v├ílido.');
      process.exit(1);
    }

    const nombre = (
      args.name ||
      args.nombre ||
      process.env.ADMIN_NAME ||
      (await prompt('Nombre completo del administrador: '))
    ).trim() || 'Administrador EntradaWeb';

    let password = args.password || process.env.ADMIN_PASSWORD;
    if (!password) {
      password = await prompt('Contrase├▒a del administrador (m├¡nimo 6 caracteres): ');
    }

    if (!password || password.length < 6) {
      console.error('ÔØî Error: La contrase├▒a debe tener al menos 6 caracteres.');
      process.exit(1);
    }

    console.log('\nHasheando contrase├▒a con bcrypt...');
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    console.log(`Verificando si el usuario ${email} ya existe...`);
    const usuarioExistente = await databaseService.queryParams(
      'SELECT id, email, rol FROM usuarios WHERE email = ?',
      [email]
    );

    if (usuarioExistente.result && usuarioExistente.result.length > 0) {
      console.log(`El usuario ${email} ya existe (ID: ${usuarioExistente.result[0].id}). Actualizando rol a admin y contrase├▒a...`);
      await databaseService.queryParams(
        'UPDATE usuarios SET nombre = ?, password = ?, rol = ? WHERE email = ?',
        [nombre, passwordHash, 'admin', email]
      );
      console.log(`Ô£à Administrador actualizado exitosamente.`);
    } else {
      console.log(`Insertando nuevo administrador en la base de datos...`);
      const insertResult = await databaseService.queryParams(
        'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
        [nombre, email, passwordHash, 'admin']
      );
      console.log(`Ô£à Administrador creado exitosamente (ID: ${insertResult.result.insertId}).`);
    }

    console.log(`\nEmail: ${email}`);
    console.log(`Nombre: ${nombre}`);
    console.log(`Rol: admin`);
    console.log('Contrase├▒a almacenada en formato hash bcrypt (irreversible).');
    console.log('\nListo para iniciar sesi├│n en EntradaWeb.');
  } catch (error) {
    console.error('ÔØî Error al crear usuario administrador:', error.message);
    process.exit(1);
  }
}

main();
