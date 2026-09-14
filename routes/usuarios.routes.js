const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');
const comprasController = require('../controllers/compras.controller');
const { authenticate } = require('../middleware/auth.middleware');

// POST /api/usuarios — Registrar un nuevo usuario
router.post('/', usuariosController.crearUsuario);

// GET /api/usuarios/:id — Obtener información pública de un usuario
router.get('/:id', usuariosController.obtenerUsuario);

// GET /api/usuarios/:usuarioId/compras — Obtener compras de un usuario específico
router.get('/:usuarioId/compras', authenticate, comprasController.obtenerComprasPorUsuario);

module.exports = router;
