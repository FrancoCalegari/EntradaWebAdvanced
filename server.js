// server.js
// Servidor principal de EntradaWeb Backend — Carla Fassaneli (Backend & Base de Datos)

// Cargar variables de entorno antes que cualquier otro módulo
require('dotenv').config();

const express = require('express');
const spiderwebClient = require('./services/spiderweb.client');
const databaseService = require('./services/database');
const usuariosRoutes = require('./routes/usuarios.routes');
const authRoutes = require('./routes/auth.routes');
const eventosRoutes = require('./routes/eventos.routes');
const entradasRoutes = require('./routes/entradas.routes');
const comprasRoutes = require('./routes/compras.routes');
const { authenticate, authorize } = require('./middleware/auth.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON en el body de las peticiones
app.use(express.json());

// ────────────────────────────────────────────
// Rutas base de infraestructura y verificación
// ────────────────────────────────────────────

// GET /api/test/spiderweb — Verificar conexión con Spider-Web ARG API
app.get('/api/test/spiderweb', async (req, res) => {
  try {
    const data = await spiderwebClient.get('/databases');

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message.includes('no está configurada')) {
      statusCode = 500;
    } else if (error.message.includes('status 401') || error.message.includes('status 403')) {
      statusCode = 401;
    } else if (error.message.includes('status 4')) {
      statusCode = 400;
    } else if (error.message.includes('Timeout')) {
      statusCode = 504;
    }

    return res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/test/database — Verificar Database Service (SHOW TABLES)
app.get('/api/test/database', async (req, res) => {
  try {
    const resultado = await databaseService.query('SHOW TABLES');

    return res.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message.includes('no está configurada')) {
      statusCode = 500;
    } else if (error.message.includes('status 401') || error.message.includes('status 403')) {
      statusCode = 401;
    } else if (error.message.includes('status 4')) {
      statusCode = 400;
    } else if (error.message.includes('Timeout')) {
      statusCode = 504;
    }

    return res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/test/auth — Verificar autenticación JWT
app.get('/api/test/auth', authenticate, (req, res) => {
  return res.json({
    success: true,
    message: 'Token válido',
    user: req.user,
  });
});

// GET /api/test/admin — Verificar autorización por rol admin
app.get('/api/test/admin', authenticate, authorize('admin'), (req, res) => {
  return res.json({
    success: true,
    message: 'Acceso concedido a admin',
    user: req.user,
  });
});

// ────────────────────────────────────────────
// Rutas oficiales del Backend de EntradaWeb
// ────────────────────────────────────────────

// Módulo de Usuarios (/api/usuarios)
app.use('/api/usuarios', usuariosRoutes);

// Módulo de Autenticación (/api/auth)
app.use('/api/auth', authRoutes);

// Módulo de Eventos (/api/eventos)
app.use('/api/eventos', eventosRoutes);

// Módulo de Entradas (/api/entradas)
app.use('/api/entradas', entradasRoutes);

// Módulo de Compras (/api/compras)
app.use('/api/compras', comprasRoutes);

// ────────────────────────────────────────────
// Iniciar servidor
// ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
