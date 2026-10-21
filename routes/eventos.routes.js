const express = require('express');
const router = express.Router();

const eventosController = require('../controllers/eventos.controller');
const entradasController = require('../controllers/entradas.controller');

const localEventAdmin = require('../middleware/local-event-admin.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Listar eventos (publico)
router.get('/', eventosController.obtenerEventos);

// Obtener un evento por ID (publico)
router.get('/:id', eventosController.obtenerEventoPorId);

// Crear evento (administracion local o administrador autenticado)
router.post('/', localEventAdmin, eventosController.crearEvento);

// Actualizar evento (administracion local o administrador autenticado)
router.put('/:id', localEventAdmin, eventosController.actualizarEvento);

// Eliminar evento (administracion local o administrador autenticado)
router.delete('/:id', localEventAdmin, eventosController.eliminarEvento);

// Listar entradas de un evento (publico)
router.get(
  '/:eventoId/entradas',
  entradasController.obtenerEntradasPorEvento
);

// Crear entradas: sigue requiriendo administrador autenticado
router.post(
  '/:eventoId/entradas',
  authenticate,
  authorize('admin'),
  entradasController.crearEntrada
);

module.exports = router;
