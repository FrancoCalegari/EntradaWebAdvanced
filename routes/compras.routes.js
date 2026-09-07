// routes/compras.routes.js
// Rutas para el módulo de compras (/api/compras).

const express = require('express');
const router = express.Router();
const comprasController = require('../controllers/compras.controller');
const { authenticate } = require('../middleware/auth.middleware');

// POST /api/compras — Crear una nueva compra (Cliente o Admin autenticado)
router.post('/', authenticate, comprasController.crearCompra);

// GET /api/compras — Listar compras (Cliente: propias; Admin: todas)
router.get('/', authenticate, comprasController.obtenerCompras);

// GET /api/compras/:id — Detalle de una compra específica
router.get('/:id', authenticate, comprasController.obtenerCompraPorId);

module.exports = router;
