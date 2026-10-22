
'use strict';

// Servidor principal de EntradaWeb
// Backend + frontend estático, compatible con ejecución local y Vercel.

// Cargar variables de entorno antes de importar los servicios.
require('dotenv').config();

const express = require('express');
const path = require('path');

const spiderwebClient = require('./services/spiderweb.client');
const databaseService = require('./services/database');

const usuariosRoutes = require('./routes/usuarios.routes');
const authRoutes = require('./routes/auth.routes');
const eventosRoutes = require('./routes/eventos.routes');
const entradasRoutes = require('./routes/entradas.routes');
const comprasRoutes = require('./routes/compras.routes');

const {
  authenticate,
  authorize,
} = require('./middleware/auth.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Normalización de ruta para Serverless en Vercel con rewrites internos
app.use((req, res, next) => {
  const forwardedUri = req.headers['x-forwarded-uri'] || req.headers['x-matched-path'];
  if (forwardedUri && (req.url === '/api/index.js' || req.url === '/api/index' || req.url.startsWith('/api/index.js') || req.url.startsWith('/api/index'))) {
    let target = forwardedUri;
    if (!target.includes('?') && req.url.includes('?')) {
      target += req.url.slice(req.url.indexOf('?'));
    }
    req.url = target;
  } else if (req.originalUrl && req.originalUrl !== req.url && (req.url === '/api/index.js' || req.url === '/api/index')) {
    req.url = req.originalUrl;
  }
  next();
});

// Permitir recibir peticiones JSON.
app.use(express.json());

// Cabeceras CORS y manejo de preflight OPTIONS (útil para despliegue en Vercel)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Servir los archivos estáticos del frontend existente.
app.use(express.static(path.join(__dirname, 'public')));
// --------------------------------------------------
// RUTAS DE VERIFICACIÓN DE INFRAESTRUCTURA
// --------------------------------------------------

// GET /api/test/spiderweb
// Comprueba la comunicación con SpiderWebAPI.
app.get('/api/test/spiderweb', async (req, res) => {
  try {
    const data = await spiderwebClient.get('/databases');

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error al verificar SpiderWebAPI:', error.message);

    let statusCode = 500;

    if (/status 401|status 403/i.test(error.message)) {
      statusCode = 401;
    } else if (/status 4\d\d/i.test(error.message)) {
      statusCode = 400;
    } else if (/timeout/i.test(error.message)) {
      statusCode = 504;
    }

    return res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/test/database
// Comprueba el acceso a la base de datos.
app.get('/api/test/database', async (req, res) => {
  try {
    const resultado = await databaseService.query('SHOW TABLES');

    return res.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    console.error('Error al verificar la base de datos:', error.message);

    let statusCode = 500;

    if (/status 401|status 403/i.test(error.message)) {
      statusCode = 401;
    } else if (/status 4\d\d/i.test(error.message)) {
      statusCode = 400;
    } else if (/timeout/i.test(error.message)) {
      statusCode = 504;
    }

    return res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/test/auth
// Requiere un token JWT válido.
app.get('/api/test/auth', authenticate, (req, res) => {
  return res.json({
    success: true,
    message: 'Token válido',
    user: req.user,
  });
});

// GET /api/test/admin
// Requiere autenticación y rol administrador.
app.get(
  '/api/test/admin',
  authenticate,
  authorize('admin'),
  (req, res) => {
    return res.json({
      success: true,
      message: 'Acceso concedido a admin',
      user: req.user,
    });
  }
);

// --------------------------------------------------
// RUTAS PRINCIPALES DE LA API
// --------------------------------------------------

app.use('/api/usuarios', usuariosRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/eventos', eventosRoutes);
app.use('/api/entradas', entradasRoutes);
app.use('/api/compras', comprasRoutes);

// --------------------------------------------------
// MANEJO DE ERRORES Y RUTAS INEXISTENTES
// --------------------------------------------------

// Las rutas de API inexistentes devuelven JSON.
// Las demás muestran la página 404 del frontend.
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: 'Ruta de API no encontrada',
    });
  }

  return res.status(404).sendFile(
    path.join(__dirname, 'public', '404.html'),
    (error) => {
      if (error && !res.headersSent) {
        res.status(404).send('Página no encontrada');
      }
    }
  );
});

// --------------------------------------------------
// INICIO LOCAL Y EXPORTACIÓN PARA VERCEL
// --------------------------------------------------

// Al ejecutar npm start, inicia el servidor local.
// Cuando Vercel importa este archivo, no abre un puerto.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
  });
}

// Permite que api/index.js importe la aplicación Express.
module.exports = app;
