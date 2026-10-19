// routes/entradas.routes.js
// Rutas directas para el módulo de entradas (/api/entradas).

const express = require('express');
const router = express.Router();
const entradasController = require('../controllers/entradas.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// GET /api/entradas — Listado público de todas las entradas
router.get('/', entradasController.obtenerEntradas);

// GET /api/entradas/:id — Detalle público de una entrada por ID
router.get('/:id', entradasController.obtenerEntradaPorId);

// POST /api/entradas — Crear una entrada (Admin)
router.post('/', authenticate, authorize('admin'), entradasController.crearEntrada);

// PUT /api/entradas/:id — Modificar una entrada existente (Admin)
router.put('/:id', authenticate, authorize('admin'), entradasController.actualizarEntrada);

// DELETE /api/entradas/:id — Eliminar una entrada existente (Admin)
router.delete('/:id', authenticate, authorize('admin'), entradasController.eliminarEntrada);

module.exports = router;
