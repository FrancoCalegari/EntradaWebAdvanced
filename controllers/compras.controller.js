// controllers/compras.controller.js
// Controlador para el módulo de compras, detalles de compras y control transaccional de stock.

const databaseService = require('../services/database');

/**
 * POST /api/compras
 * Crear una nueva compra con sus detalles y descontar stock de forma atómica.
 * Requiere JWT (rol cliente o admin). El usuario_id se extrae de req.user.id.
 */
async function crearCompra(req, res) {
  const usuarioId = req.user.id;
  const { items } = req.body;

  // ── 1. Validaciones básicas del cuerpo de la petición ──
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'El campo "items" es obligatorio y debe ser un array con al menos un elemento',
    });
  }

  // Consolidar entradas duplicadas dentro de la misma compra
  const itemsMap = new Map();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (!item || typeof item !== 'object') {
      return res.status(400).json({
        success: false,
        message: `El elemento en la posición ${i} debe ser un objeto válido`,
      });
    }

    const { entrada_id, cantidad } = item;

    const entradaIdNum = parseInt(entrada_id, 10);
    if (isNaN(entradaIdNum) || entradaIdNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Cada item debe contener un "entrada_id" numérico válido y mayor a 0',
      });
    }

    const cantidadNum = parseInt(cantidad, 10);
    if (isNaN(cantidadNum) || cantidadNum <= 0 || !Number.isInteger(Number(cantidad))) {
      return res.status(400).json({
        success: false,
        message: 'La "cantidad" debe ser un número entero mayor a 0',
      });
    }

    // Consolidar si ya existe en la lista
    if (itemsMap.has(entradaIdNum)) {
      itemsMap.set(entradaIdNum, itemsMap.get(entradaIdNum) + cantidadNum);
    } else {
      itemsMap.set(entradaIdNum, cantidadNum);
    }
  }

  // Convertir items consolidados a array de trabajo
  const itemsConsolidados = [];
  for (const [entrada_id, cantidad] of itemsMap.entries()) {
    itemsConsolidados.push({ entrada_id, cantidad });
  }

  // ── 2. Verificación de existencia y cálculo de precios / stock ──
  const detallesCalculados = [];
  let totalCalculado = 0;

  for (const item of itemsConsolidados) {
    const entradaRes = await databaseService.queryParams(
      'SELECT id, evento_id, tipo, precio, stock FROM entradas WHERE id = ?',
      [item.entrada_id]
    );

    if (!entradaRes.result || entradaRes.result.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Entrada con ID ${item.entrada_id} no encontrada`,
      });
    }

    const entrada = entradaRes.result[0];

    // Verificar stock disponible
    if (entrada.stock < item.cantidad) {
      return res.status(409).json({
        success: false,
        message: `Stock insuficiente para la entrada "${entrada.tipo}" (ID: ${entrada.id}). Stock disponible: ${entrada.stock}, solicitado: ${item.cantidad}`,
      });
    }

    const precioUnitario = parseFloat(entrada.precio);
    const subtotal = parseFloat((precioUnitario * item.cantidad).toFixed(2));
    totalCalculado += subtotal;

    detallesCalculados.push({
      entrada_id: entrada.id,
      tipo: entrada.tipo,
      cantidad: item.cantidad,
      precio_unitario: precioUnitario,
      subtotal,
    });
  }

  totalCalculado = parseFloat(totalCalculado.toFixed(2));

  // ── 3. Ejecución Transaccional con Atomic CAS y Rollback de Compensación ──
  const itemsDescontados = [];
  let compraIdCreada = null;

  try {
    // A. Descontar stock atómicamente con verificación de concurrencia (CAS)
    for (const item of detallesCalculados) {
      const updateStockRes = await databaseService.queryParams(
        'UPDATE entradas SET stock = stock - ? WHERE id = ? AND stock >= ?',
        [item.cantidad, item.entrada_id, item.cantidad]
      );

      if (!updateStockRes.result || updateStockRes.result.affectedRows === 0) {
        // Conflicto de concurrencia: el stock cambió antes de aplicar el descuento
        throw new Error(`CONCURRENCY_STOCK_ERROR:${item.entrada_id}`);
      }

      itemsDescontados.push({
        entrada_id: item.entrada_id,
        cantidad: item.cantidad,
      });
    }

    // B. Crear registro en tabla compras
    const compraRes = await databaseService.queryParams(
      'INSERT INTO compras (usuario_id, total, estado) VALUES (?, ?, ?)',
      [usuarioId, totalCalculado, 'completada']
    );

    if (!compraRes.result || !compraRes.result.insertId) {
      throw new Error('ERROR_CREATING_COMPRA');
    }

    compraIdCreada = compraRes.result.insertId;

    // C. Crear registros en detalle_compras
    const detallesInsertados = [];
    for (const detalle of detallesCalculados) {
      const detalleRes = await databaseService.queryParams(
        'INSERT INTO detalle_compras (compra_id, entrada_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
        [compraIdCreada, detalle.entrada_id, detalle.cantidad, detalle.precio_unitario, detalle.subtotal]
      );

      detallesInsertados.push({
        id: detalleRes.result.insertId,
        compra_id: compraIdCreada,
        entrada_id: detalle.entrada_id,
        tipo: detalle.tipo,
        cantidad: detalle.cantidad,
        precio_unitario: detalle.precio_unitario,
        subtotal: detalle.subtotal,
      });
    }

    // D. Obtener la compra completa creada
    const compraFinalRes = await databaseService.queryParams(
      'SELECT id, usuario_id, total, estado, created_at FROM compras WHERE id = ?',
      [compraIdCreada]
    );

    return res.status(201).json({
      success: true,
      data: {
        compra: compraFinalRes.result[0],
        detalles: detallesInsertados,
        total: totalCalculado,
      },
    });
  } catch (error) {
    console.error('Error durante la transacción de compra. Iniciando rollback...', error.message);

    // ── ROLLBACK DE COMPENSACIÓN ──
    // 1. Restaurar stock de los items que alcanzaron a descontarse
    for (const item of itemsDescontados) {
      try {
        await databaseService.queryParams(
          'UPDATE entradas SET stock = stock + ? WHERE id = ?',
          [item.cantidad, item.entrada_id]
        );
      } catch (rollbackErr) {
        console.error(`Error en rollback de stock para entrada ${item.entrada_id}:`, rollbackErr.message);
      }
    }

    // 2. Eliminar detalles de compras y compra si llegaron a crearse
    if (compraIdCreada) {
      try {
        await databaseService.queryParams(
          'DELETE FROM detalle_compras WHERE compra_id = ?',
          [compraIdCreada]
        );
        await databaseService.queryParams(
          'DELETE FROM compras WHERE id = ?',
          [compraIdCreada]
        );
      } catch (rollbackErr) {
        console.error(`Error en rollback de compra ${compraIdCreada}:`, rollbackErr.message);
      }
    }

    if (error.message.startsWith('CONCURRENCY_STOCK_ERROR')) {
      return res.status(409).json({
        success: false,
        message: 'Stock insuficiente para la entrada seleccionada debido a una compra concurrente',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno al procesar la compra. No se aplicaron cambios ni descuentos de stock.',
    });
  }
}

/**
 * GET /api/compras
 * Listar compras.
 * - Cliente: obtiene exclusivamente sus propias compras.
 * - Admin: obtiene todas las compras del sistema.
 */
async function obtenerCompras(req, res) {
  try {
    let sql;
    let params = [];

    if (req.user.rol === 'admin') {
      sql = 'SELECT id, usuario_id, total, estado, created_at FROM compras ORDER BY created_at DESC';
    } else {
      sql = 'SELECT id, usuario_id, total, estado, created_at FROM compras WHERE usuario_id = ? ORDER BY created_at DESC';
      params = [req.user.id];
    }

    const resultado = await databaseService.queryParams(sql, params);

    return res.json({
      success: true,
      data: resultado.result || [],
    });
  } catch (error) {
    console.error('Error al obtener compras:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/**
 * GET /api/compras/:id
 * Obtener detalle de una compra específica con sus items.
 * - Cliente: solo puede consultar sus propias compras (403 si intenta acceder a otra).
 * - Admin: puede consultar cualquier compra.
 */
async function obtenerCompraPorId(req, res) {
  try {
    const { id } = req.params;
    const compraIdNum = parseInt(id, 10);

    if (isNaN(compraIdNum) || compraIdNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la compra debe ser un número válido',
      });
    }

    // 1. Obtener la compra
    const compraRes = await databaseService.queryParams(
      'SELECT id, usuario_id, total, estado, created_at FROM compras WHERE id = ?',
      [compraIdNum]
    );

    if (!compraRes.result || compraRes.result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Compra no encontrada',
      });
    }

    const compra = compraRes.result[0];

    // 2. Control de autorización: cliente solo accede a sus propias compras
    if (req.user.rol !== 'admin' && compra.usuario_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tenés permisos para acceder a esta compra',
      });
    }

    // 3. Obtener detalles con datos de la entrada y evento asociado
    const detallesRes = await databaseService.queryParams(
      `SELECT d.id, d.compra_id, d.entrada_id, d.cantidad, d.precio_unitario, d.subtotal,
              e.tipo AS entrada_tipo, e.evento_id, ev.titulo AS evento_titulo
       FROM detalle_compras d
       LEFT JOIN entradas e ON d.entrada_id = e.id
       LEFT JOIN eventos ev ON e.evento_id = ev.id
       WHERE d.compra_id = ?
       ORDER BY d.id ASC`,
      [compraIdNum]
    );

    return res.json({
      success: true,
      data: {
        compra,
        detalles: detallesRes.result || [],
      },
    });
  } catch (error) {
    console.error('Error al obtener compra por ID:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/**
 * GET /api/usuarios/:usuarioId/compras
 * Obtener compras de un usuario específico.
 * - Admin: puede consultar compras de cualquier usuario.
 * - Cliente: solo puede consultar sus propias compras (403 si intenta ver las de otro).
 */
async function obtenerComprasPorUsuario(req, res) {
  try {
    const { usuarioId } = req.params;
    const usuarioIdNum = parseInt(usuarioId, 10);

    if (isNaN(usuarioIdNum) || usuarioIdNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El ID de usuario debe ser un número válido',
      });
    }

    // Control de permisos
    if (req.user.rol !== 'admin' && req.user.id !== usuarioIdNum) {
      return res.status(403).json({
        success: false,
        message: 'No tenés permisos para acceder a las compras de otro usuario',
      });
    }

    // Verificar si el usuario existe
    const usuarioExistente = await databaseService.queryParams(
      'SELECT id FROM usuarios WHERE id = ?',
      [usuarioIdNum]
    );

    if (!usuarioExistente.result || usuarioExistente.result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    const resultado = await databaseService.queryParams(
      'SELECT id, usuario_id, total, estado, created_at FROM compras WHERE usuario_id = ? ORDER BY created_at DESC',
      [usuarioIdNum]
    );

    return res.json({
      success: true,
      data: resultado.result || [],
    });
  } catch (error) {
    console.error('Error al obtener compras por usuario:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

module.exports = {
  crearCompra,
  obtenerCompras,
  obtenerCompraPorId,
  obtenerComprasPorUsuario,
};
