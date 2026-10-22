'use strict';

const http = require('http');
const assert = require('assert');

async function testVercelAndServer() {
  console.log('🧪 Iniciando verificación de compatibilidad Vercel y servidor...');

  // 1. Probar importación de api/index.js (como lo hace el runtime Serverless de Vercel)
  console.log('1️⃣ Verificando api/index.js:');
  const vercelApp = require('../api/index.js');
  assert(typeof vercelApp === 'function', 'api/index.js exporta una aplicación Express válida');
  console.log('  ✅ api/index.js es exportable y compatible con Vercel Serverless');

  // 2. Probar vercel.json
  console.log('\n2️⃣ Verificando configuración vercel.json:');
  const vercelConfig = require('../vercel.json');
  assert(Array.isArray(vercelConfig.rewrites), 'vercel.json contiene array de rewrites');
  const hasApiRewrite = vercelConfig.rewrites.some(r => r.destination === '/api/index.js');
  assert(hasApiRewrite, 'vercel.json redirige /api/* hacia /api/index.js');
  console.log('  ✅ vercel.json configurado correctamente para enrutar API y estáticos');

  // 3. Levantar servidor Express en puerto efímero para pruebas de endpoints y CORS
  console.log('\n3️⃣ Verificando servidor HTTP y endpoints:');
  const server = http.createServer(vercelApp);
  await new Promise(resolve => server.listen(3456, resolve));
  const baseUrl = 'http://localhost:3456';

  try {
    // Test: Inicio
    const resHome = await fetch(`${baseUrl}/`);
    assert.strictEqual(resHome.status, 200, 'GET / responde 200');
    const textHome = await resHome.text();
    assert(textHome.includes('EntradaWeb'), 'GET / entrega index.html');
    console.log('  ✅ GET / entrega frontend principal');

    // Test: Páginas estáticas
    for (const page of ['login.html', 'register.html', 'admin-showcase.html', 'carrito.html', 'evento-detalle.html', 'mis-compras.html']) {
      const resPage = await fetch(`${baseUrl}/pages/${page}`);
      assert.strictEqual(resPage.status, 200, `GET /pages/${page} responde 200`);
    }
    console.log('  ✅ Todas las páginas HTML públicas responden HTTP 200');

    // Test: Preflight OPTIONS y cabeceras CORS
    const resOptions = await fetch(`${baseUrl}/api/eventos`, { method: 'OPTIONS' });
    assert.strictEqual(resOptions.status, 200, 'OPTIONS responde 200');
    assert.strictEqual(resOptions.headers.get('access-control-allow-origin'), '*', 'CORS Allow-Origin presente');
    console.log('  ✅ Preflight OPTIONS y CORS funcionando');

    // Test: GET /api/eventos
    const resEventos = await fetch(`${baseUrl}/api/eventos`);
    assert.strictEqual(resEventos.status, 200, 'GET /api/eventos responde 200');
    const dataEventos = await resEventos.json();
    assert(dataEventos.success && Array.isArray(dataEventos.data), 'GET /api/eventos devuelve lista');
    console.log(`  ✅ GET /api/eventos responde exitosamente (${dataEventos.data.length} eventos)`);

    // Test: Registro y Login de usuario
    const rand = Date.now();
    const testEmail = `user.${rand}@test.com`;
    const testPass = 'Password123!';
    const resReg = await fetch(`${baseUrl}/api/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Usuario Test Vercel', email: testEmail, password: testPass })
    });
    const dataReg = await resReg.json();
    assert(resReg.status === 201 && dataReg.success, 'POST /api/usuarios registra usuario');

    const resLog = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPass })
    });
    const dataLog = await resLog.json();
    assert(resLog.status === 200 && dataLog.data?.token, 'POST /api/auth/login inicia sesión');
    console.log('  ✅ Registro y Login de usuarios funcionando de extremo a extremo');

    // Test: Manejo 404
    const res404Api = await fetch(`${baseUrl}/api/ruta-que-no-existe`);
    assert.strictEqual(res404Api.status, 404);
    const data404 = await res404Api.json();
    assert.strictEqual(data404.success, false, '404 de API devuelve JSON');

    const res404Html = await fetch(`${baseUrl}/pagina-que-no-existe`);
    assert.strictEqual(res404Html.status, 404);
    const text404 = await res404Html.text();
    assert(text404.includes('404') || text404.includes('Página no encontrada'), '404 web entrega 404.html');
    console.log('  ✅ Manejo diferenciado de 404 (JSON para /api y HTML para web) verificado');

    console.log('\n🎉 ¡TODAS LAS COMPROBACIONES DE VERCEL Y SERVIDOR PASARON EXITOSAMENTE!');
  } finally {
    server.close();
  }
}

testVercelAndServer().catch(err => {
  console.error('❌ Error en las comprobaciones:', err);
  process.exit(1);
});
