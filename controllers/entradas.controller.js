// controllers/entradas.controller.js
// Controlador para el CRUD completo del módulo de entradas.

const databaseService = require('../services/database');

/**
 * GET /api/entradas
 * Listar todas las entradas registradas.
 */
async function obtenerEntradas(req, res) {
  try {
    const resultado = await databaseService.query(
      'SELECT id, evento_id, tipo, precio, stock, created_at FROM entradas ORDER BY id ASC'
    );

    return res.json({
      success: true,
      data: resultado.result || [],
    });
  } catch (error) {
    console.error('Error al obtener entradas:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/**
 * GET /api/entradas/:id
 * Obtener una entrada por su ID.
 */
async function obtenerEntradaPorId(req, res) {
  try {
    const { id } = req.params;
    const idNumero = parseInt(id, 10);

    if (isNaN(idNumero) || idNumero <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la entrada debe ser un número válido',
      });
    }

    const resultado = await databaseService.queryParams(
      'SELECT id, evento_id, tipo, precio, stock, created_at FROM entradas WHERE id = ?',
      [idNumero]
    );

    if (!resultado.result || resultado.result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Entrada no encontrada',
      });
    }

    return res.json({
      success: true,
      data: resultado.result[0],
    });
  } catch (error) {
    console.error('Error al obtener entrada por ID:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/**
 * GET /api/eventos/:eventoId/entradas
 * Obtener todas las entradas pertenecientes a un evento.
 */
async function obtenerEntradasPorEvento(req, res) {
  try {
    const { eventoId } = req.params;
    const eventoIdNumero = parseInt(eventoId, 10);

    if (isNaN(eventoIdNumero) || eventoIdNumero <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El ID del evento debe ser un número válido',
      });
    }

    // 1. Verificar si el evento existe
    const evento = await databaseService.queryParams(
      'SELECT id FROM eventos WHERE id = ?',
      [eventoIdNumero]
    );

    if (!evento.result || evento.result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado',
      });
    }

    // 2. Obtener las entradas asociadas
    const resultado = await databaseService.queryParams(
      'SELECT id, evento_id, tipo, precio, stock, created_at FROM entradas WHERE evento_id = ? ORDER BY id ASC',
      [eventoIdNumero]
    );

    return res.json({
      success: true,
      data: resultado.result || [],
    });
  } catch (error) {
    console.error('Error al obtener entradas por evento:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/**
 * POST /api/eventos/:eventoId/entradas
 * Crear una entrada asociada a un evento (requiere JWT + rol admin).
 */
async function crearEntrada(req, res) {
  try {
    const { eventoId } = req.params;
    const eventoIdNumero = parseInt(eventoId, 10);

    if (isNaN(eventoIdNumero) || eventoIdNumero <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El ID del evento debe ser un número válido',
      });
    }

    // 1. Verificar si el evento existe
    const evento = await databaseService.queryParams(
      'SELECT id FROM eventos WHERE id = ?',
      [eventoIdNumero]
    );

    if (!evento.result || evento.result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado',
      });
    }

    const { tipo, precio, stock } = req.body;

    // 2. Validaciones de datos
    if (!tipo || typeof tipo !== 'string' || !tipo.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El campo "tipo" es obligatorio',
      });
    }

    if (tipo.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'El campo "tipo" no puede superar los 100 caracteres',
      });
    }

    if (precio === undefined || precio === null || precio === '') {
      return res.status(400).json({
        success: false,
        message: 'El campo "precio" es obligatorio',
      });
    }

    const precioNumero = parseFloat(precio);
    if (isNaN(precioNumero) || precioNumero < 0) {
      return res.status(400).json({
        success: false,
        message: 'El campo "precio" debe ser un número válido mayor o igual a 0',
      });
    }

    let stockNumero = 0;
    if (stock !== undefined && stock !== null && stock !== '') {
      stockNumero = parseInt(stock, 10);
      if (isNaN(stockNumero) || stockNumero < 0 || !Number.isInteger(Number(stock))) {
        return res.status(400).json({
          success: false,
          message: 'El campo "stock" debe ser un número entero mayor o igual a 0',
        });
      }
    }

    const tipoLimpio = tipo.trim();

    // 3. Insertar entrada en la base de datos
    const resultado = await databaseService.queryParams(
      'INSERT INTO entradas (evento_id, tipo, precio, stock) VALUES (?, ?, ?, ?)',
      [eventoIdNumero, tipoLimpio, precioNumero, stockNumero]
    );

    const nuevoId = resultado.result.insertId;

    const entradaCreada = await databaseService.queryParams(
      'SELECT id, evento_id, tipo, precio, stock, created_at FROM entradas WHERE id = ?',
      [nuevoId]
    );

    return res.status(201).json({
      success: true,
      data: entradaCreada.result[0],
    });
  } catch (error) {
    console.error('Error al crear entrada:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/**
 * PUT /api/entradas/:id
 * Modificar una entrada existente (requiere JWT + rol admin).
 */
async function actualizarEntrada(req, res) {
  try {
    const { id } = req.params;
    const idNumero = parseInt(id, 10);

    if (isNaN(idNumero) || idNumero <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la entrada debe ser un número válido',
      });
    }

    // 1. Verificar si la entrada existe
    const entradaExistente = await databaseService.queryParams(
      'SELECT id, evento_id, tipo, precio, stock, created_at FROM entradas WHERE id = ?',
      [idNumero]
    );

    if (!entradaExistente.result || entradaExistente.result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Entrada no encontrada',
      });
    }

    const { tipo, precio, stock } = req.body;

    if (tipo === undefined && precio === undefined && stock === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Debe enviar al menos un campo para actualizar (tipo, precio, stock)',
      });
    }

    // 2. Validar datos recibidos
    if (tipo !== undefined) {
      if (typeof tipo !== 'string' || !tipo.trim()) {
        return res.status(400).json({
          success: false,
          message: 'El campo "tipo" no puede estar vacío',
        });
      }
      if (tipo.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: 'El campo "tipo" no puede superar los 100 caracteres',
        });
      }
    }

    if (precio !== undefined) {
      const precioNumero = parseFloat(precio);
      if (isNaN(precioNumero) || precioNumero < 0) {
        return res.status(400).json({
          success: false,
          message: 'El campo "precio" debe ser un número válido mayor o igual a 0',
        });
      }
    }

    if (stock !== undefined) {
      const stockNumero = parseInt(stock, 10);
      if (isNaN(stockNumero) || stockNumero < 0 || !Number.isInteger(Number(stock))) {
        return res.status(400).json({
          success: false,
          message: 'El campo "stock" debe ser un número entero mayor o igual a 0',
        });
      }
    }

    const entradaActual = entradaExistente.result[0];
    const nuevoTipo = tipo !== undefined ? tipo.trim() : entradaActual.tipo;
    const nuevoPrecio = precio !== undefined ? parseFloat(precio) : parseFloat(entradaActual.precio);
    const nuevoStock = stock !== undefined ? parseInt(stock, 10) : entradaActual.stock;

    await databaseService.queryParams(
      'UPDATE entradas SET tipo = ?, precio = ?, stock = ? WHERE id = ?',
      [nuevoTipo, nuevoPrecio, nuevoStock, idNumero]
    );

    const entradaActualizada = await databaseService.queryParams(
      'SELECT id, evento_id, tipo, precio, stock, created_at FROM entradas WHERE id = ?',
      [idNumero]
    );

    return res.json({
      success: true,
      data: entradaActualizada.result[0],
    });
  } catch (error) {
    console.error('Error al actualizar entrada:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/**
 * DELETE /api/entradas/:id
 * Eliminar una entrada (requiere JWT + rol admin).
 * Valida integridad referencial con la tabla detalle_compras.
 */
async function eliminarEntrada(req, res) {
  try {
    const { id } = req.params;
    const idNumero = parseInt(id, 10);

    if (isNaN(idNumero) || idNumero <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la entrada debe ser un número válido',
      });
    }

    // 1. Verificar existencia de la entrada
    const entradaExistente = await databaseService.queryParams(
      'SELECT id FROM entradas WHERE id = ?',
      [idNumero]
    );

    if (!entradaExistente.result || entradaExistente.result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Entrada no encontrada',
      });
    }

    // 2. Verificar dependencias en detalle_compras
    const dependencias = await databaseService.queryParams(
      'SELECT id FROM detalle_compras WHERE entrada_id = ? LIMIT 1',
      [idNumero]
    );

    if (dependencias.result && dependencias.result.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'No se puede eliminar la entrada porque tiene compras asociadas',
      });
    }

    // 3. Eliminar entrada
    await databaseService.queryParams(
      'DELETE FROM entradas WHERE id = ?',
      [idNumero]
    );

    return res.json({
      success: true,
      message: 'Entrada eliminada correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar entrada:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

module.exports = {
  obtenerEntradas,
  obtenerEntradaPorId,
  obtenerEntradasPorEvento,
  crearEntrada,
  actualizarEntrada,
  eliminarEntrada,
};
