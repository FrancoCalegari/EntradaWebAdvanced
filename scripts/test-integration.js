// scripts/test-integration.js
// Prueba de integraci├│n completa de punta a punta (End-to-End).

require('dotenv').config();
const http = require('http');
const express = require('express');
const bcrypt = require('bcryptjs');

// Importar rutas y controladores existentes
const authRoutes = require('../routes/auth.routes');
const eventosRoutes = require('../routes/eventos.routes');
const entradasRoutes = require('../routes/entradas.routes');
const databaseService = require('../services/database');

async function ejecutarPruebas() {
  console.log('­ƒº¬ Iniciando Suite de Pruebas de Integraci├│n E2E EntradaWeb...\n');

  // 1. Configurar app express de test
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/eventos', eventosRoutes);
  app.use('/api/entradas', entradasRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(3001, resolve));
  const baseUrl = 'http://localhost:3001';

  let tokenAdmin = null;
  let testEventoId = null;
  let testEntradaId = null;
  let totalPasadas = 0;
  let totalFalladas = 0;

  // Credenciales generadas din├ímicamente en tiempo de ejecuci├│n (sin secretos fijos)
  const dynamicAdminEmail = `test.admin.${Date.now()}@example.com`;
  const dynamicAdminSecret = `DynamicAuth_${Date.now()}_Key`;

  function assert(cond, msg) {
    if (cond) {
      console.log(`  Ô£à PAS├ô: ${msg}`);
      totalPasadas++;
    } else {
      console.error(`  ÔØî FALL├ô: ${msg}`);
      totalFalladas++;
    }
  }

  try {
    // ÔöÇÔöÇ Test 1: Conexi├│n con SpiderWeb y Base de datos ÔöÇÔöÇ
    console.log('1´©ÅÔâú Conectividad de Base de Datos y Variables de Entorno:');
    const dbTest = await databaseService.query('SELECT 1 AS ok');
    assert(dbTest && dbTest.success, 'Conexi├│n exitosa a SpiderWeb ARG API');

    // Crear usuario admin din├ímico para la suite de pruebas
    const hashedSecret = await bcrypt.hash(dynamicAdminSecret, 10);
    await databaseService.queryParams(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
      ['Admin Test E2E', dynamicAdminEmail, hashedSecret, 'admin']
    );

    // ÔöÇÔöÇ Test 2: Login con credenciales de Administrador ÔöÇÔöÇ
    console.log('\n2´©ÅÔâú Autenticaci├│n y Generaci├│n de JWT:');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: dynamicAdminEmail,
        password: dynamicAdminSecret,
      }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.ok && loginData.success, 'Login exitoso con usuario admin');
    assert(loginData.data && loginData.data.token, 'Token JWT devuelto en la respuesta');
    assert(loginData.data.user && loginData.data.user.rol === 'admin', 'El rol del usuario es "admin"');
    tokenAdmin = loginData.data.token;

    // ÔöÇÔöÇ Test 3: Rechazo de login inv├ílido ÔöÇÔöÇ
    const loginInvalidoRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: dynamicAdminEmail,
        password: dynamicAdminSecret + '_invalido',
      }),
    });
    assert(loginInvalidoRes.status === 401, 'Rechazo de credenciales incorrectas (HTTP 401)');

    // ÔöÇÔöÇ Test 4: Endpoint p├║blico de eventos ÔöÇÔöÇ
    console.log('\n3´©ÅÔâú M├│dulo de Eventos (P├║blico y Compatibilidad):');
    const eventosRes = await fetch(`${baseUrl}/api/eventos`);
    const eventosData = await eventosRes.json();
    assert(eventosRes.ok && eventosData.success, 'GET /api/eventos responde exitosamente');
    assert(Array.isArray(eventosData.data) && eventosData.data.length > 0, `Eventos obtenidos (${eventosData.data.length} encontrados)`);

    const primerEvento = eventosData.data[0];
    assert(primerEvento.titulo && primerEvento.nombre, 'Compatibilidad dual: el evento posee tanto "titulo" como "nombre"');
    assert(primerEvento.precio !== undefined && primerEvento.precio_min !== undefined, 'Compatibilidad dual: posee tanto "precio" como "precio_min"');
    assert('imagen' in primerEvento && 'categoria' in primerEvento && 'estado' in primerEvento, 'Contiene campos de dise├▒o: imagen, categoria, estado');

    // ÔöÇÔöÇ Test 5: Crear Evento con JWT (POST /api/eventos) ÔöÇÔöÇ
    console.log('\n4´©ÅÔâú CRUD de Eventos (Protegido por Admin JWT):');
    const crearRes = await fetch(`${baseUrl}/api/eventos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify({
        nombre: 'Evento de Prueba E2E Antigravity',
        descripcion: 'Evento temporal creado durante el test automatizado',
        lugar: 'Arena Buenos Aires Test',
        fecha: '2026-12-31 22:00:00',
        categoria: 'musica',
        precio: 25000,
        estado: 'disponible',
        imagen: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14',
      }),
    });
    const crearData = await crearRes.json();
    assert(crearRes.status === 201 && crearData.success, 'POST /api/eventos crea evento correctamente');
    testEventoId = crearData.data.id;
    assert(testEventoId > 0, `Evento creado con ID: ${testEventoId}`);

    // ÔöÇÔöÇ Test 6: Crear Entrada para el Evento ÔöÇÔöÇ
    console.log('\n5´©ÅÔâú CRUD de Entradas / Tickets:');
    const crearEntradaRes = await fetch(`${baseUrl}/api/eventos/${testEventoId}/entradas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify({
        tipo: 'Entrada General Test',
        precio: 25000,
        stock: 100,
      }),
    });
    const crearEntradaData = await crearEntradaRes.json();
    assert(crearEntradaRes.status === 201 && crearEntradaData.success, 'POST /api/eventos/:id/entradas crea ticket correctamente');
    testEntradaId = crearEntradaData.data.id;
    assert(testEntradaId > 0, `Entrada creada con ID: ${testEntradaId}`);

    // ÔöÇÔöÇ Test 7: Listar Entradas del Evento ÔöÇÔöÇ
    const entradasEventoRes = await fetch(`${baseUrl}/api/eventos/${testEventoId}/entradas`);
    const entradasEventoData = await entradasEventoRes.json();
    assert(entradasEventoRes.ok && entradasEventoData.data.length === 1, 'GET /api/eventos/:id/entradas devuelve las entradas del evento');

    // ÔöÇÔöÇ Test 8: Actualizar Evento con JWT ÔöÇÔöÇ
    const updateRes = await fetch(`${baseUrl}/api/eventos/${testEventoId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify({
        nombre: 'Evento de Prueba E2E Actualizado',
        precio: 30000,
      }),
    });
    const updateData = await updateRes.json();
    assert(updateRes.ok && updateData.data.titulo === 'Evento de Prueba E2E Actualizado', 'PUT /api/eventos/:id actualiza el evento');

    // ÔöÇÔöÇ Test 9: Eliminar Entrada ÔöÇÔöÇ
    const delEntradaRes = await fetch(`${baseUrl}/api/entradas/${testEntradaId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenAdmin}` },
    });
    assert(delEntradaRes.ok, 'DELETE /api/entradas/:id elimina el ticket');

    // ÔöÇÔöÇ Test 10: Eliminar Evento ÔöÇÔöÇ
    const delEventoRes = await fetch(`${baseUrl}/api/eventos/${testEventoId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenAdmin}` },
    });
    assert(delEventoRes.ok, 'DELETE /api/eventos/:id elimina el evento');

  } catch (err) {
    console.error('Error fatal durante la prueba:', err);
    totalFalladas++;
  } finally {
    // Limpiar usuario admin de prueba
    try {
      await databaseService.queryParams(
        'DELETE FROM usuarios WHERE email = ?',
        [dynamicAdminEmail]
      );
    } catch {}

    server.close();
    console.log(`\n========================================`);
    console.log(`Resultado final: ${totalPasadas} PASARON, ${totalFalladas} FALLARON`);
    console.log(`========================================\n`);
    if (totalFalladas > 0) process.exit(1);
  }
}

ejecutarPruebas();
