// routes/eventos.routes.js
// Rutas del módulo de eventos y rutas anidadas de entradas.

const express = require('express');
const router = express.Router();
const eventosController = require('../controllers/eventos.controller');
const entradasController = require('../controllers/entradas.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// GET /api/eventos — Listado público de eventos
router.get('/', eventosController.obtenerEventos);

// GET /api/eventos/:id — Detalle público de un evento
router.get('/:id', eventosController.obtenerEventoPorId);

// POST /api/eventos — Crear un nuevo evento (Admin)
router.post('/', authenticate, authorize('admin'), eventosController.crearEvento);

// PUT /api/eventos/:id — Modificar un evento existente (Admin)
router.put('/:id', authenticate, authorize('admin'), eventosController.actualizarEvento);

// DELETE /api/eventos/:id — Eliminar un evento (Admin)
router.delete('/:id', authenticate, authorize('admin'), eventosController.eliminarEvento);

// ────────────────────────────────────────────
// Rutas anidadas de entradas asociadas a eventos
// ────────────────────────────────────────────

// GET /api/eventos/:eventoId/entradas — Listado de entradas de un evento
router.get('/:eventoId/entradas', entradasController.obtenerEntradasPorEvento);

// POST /api/eventos/:eventoId/entradas — Crear una entrada para un evento (Admin)
router.post('/:eventoId/entradas', authenticate, authorize('admin'), entradasController.crearEntrada);

module.exports = router;
