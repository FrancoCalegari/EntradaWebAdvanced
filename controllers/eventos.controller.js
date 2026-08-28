// controllers/eventos.controller.js
// Controlador para el CRUD completo del módulo de eventos.

const databaseService = require('../services/database');

/**
 * Valida si una cadena o valor corresponde a una fecha válida.
 * @param {string} fecha
 * @returns {boolean}
 */
function esFechaValida(fecha) {
  if (!fecha) return false;
  const timestamp = Date.parse(fecha);
  return !isNaN(timestamp);
}

/**
 * Formatea una fecha a formato SQL 'YYYY-MM-DD HH:MM:SS'.
 * @param {string|Date} fecha
 * @returns {string}
 */
function formatearFechaSQL(fecha) {
  const d = new Date(fecha);
  const pad = (n) => String(n).padStart(2, '0');
  const anio = d.getUTCFullYear();
  const mes = pad(d.getUTCMonth() + 1);
  const dia = pad(d.getUTCDate());
  const horas = pad(d.getUTCHours());
  const minutos = pad(d.getUTCMinutes());
  const segundos = pad(d.getUTCSeconds());
  return `${anio}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;
}

/**
 * GET /api/eventos
 * Listar todos los eventos ordenados por fecha ascendente.
 */
async function obtenerEventos(req, res) {
  try {
    const resultado = await databaseService.query(
      'SELECT id, titulo, descripcion, lugar, fecha, created_at FROM eventos ORDER BY fecha ASC'
    );

    return res.json({
      success: true,
      data: resultado.result || [],
    });
  } catch (error) {
    console.error('Error al obtener eventos:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/**
 * GET /api/eventos/:id
 * Obtener el detalle de un evento por su ID.
 */
async function obtenerEventoPorId(req, res) {
  try {
    const { id } = req.params;
    const idNumero = parseInt(id, 10);

    if (isNaN(idNumero) || idNumero <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El ID del evento debe ser un número válido',
      });
    }

    const resultado = await databaseService.queryParams(
      'SELECT id, titulo, descripcion, lugar, fecha, created_at FROM eventos WHERE id = ?',
      [idNumero]
    );

    if (!resultado.result || resultado.result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado',
      });
    }

    return res.json({
      success: true,
      data: resultado.result[0],
    });
  } catch (error) {
    console.error('Error al obtener evento por ID:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/**
 * POST /api/eventos
 * Crear un nuevo evento (requiere JWT + rol admin).
 */
async function crearEvento(req, res) {
  try {
    const { titulo, descripcion, lugar, fecha } = req.body;

    // ── Validaciones ──
    if (!titulo || typeof titulo !== 'string' || !titulo.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El campo "titulo" es obligatorio',
      });
    }

    if (titulo.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message: 'El título no puede superar los 200 caracteres',
      });
    }

    if (!fecha) {
      return res.status(400).json({
        success: false,
        message: 'El campo "fecha" es obligatorio',
      });
    }

    if (!esFechaValida(fecha)) {
      return res.status(400).json({
        success: false,
        message: 'El campo "fecha" debe contener una fecha válida (ej: YYYY-MM-DD HH:MM:SS o ISO 8601)',
      });
    }

    if (lugar && typeof lugar === 'string' && lugar.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message: 'El lugar no puede superar los 200 caracteres',
      });
    }

    const tituloLimpio = titulo.trim();
    const descripcionLimpia = descripcion ? String(descripcion).trim() : null;
    const lugarLimpio = lugar ? String(lugar).trim() : null;
    const fechaSQL = formatearFechaSQL(fecha);

    // ── Insertar en Base de Datos ──
    const resultado = await databaseService.queryParams(
      'INSERT INTO eventos (titulo, descripcion, lugar, fecha) VALUES (?, ?, ?, ?)',
      [tituloLimpio, descripcionLimpia, lugarLimpio, fechaSQL]
    );

    const nuevoId = resultado.result.insertId;

    const eventoCreado = await databaseService.queryParams(
      'SELECT id, titulo, descripcion, lugar, fecha, created_at FROM eventos WHERE id = ?',
      [nuevoId]
    );

    return res.status(201).json({
      success: true,
      data: eventoCreado.result[0],
    });
  } catch (error) {
    console.error('Error al crear evento:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/**
 * PUT /api/eventos/:id
 * Actualizar un evento existente (requiere JWT + rol admin).
 */
async function actualizarEvento(req, res) {
  try {
    const { id } = req.params;
    const idNumero = parseInt(id, 10);

    if (isNaN(idNumero) || idNumero <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El ID del evento debe ser un número válido',
      });
    }

    // ── Verificar si el evento existe ──
    const eventoExistente = await databaseService.queryParams(
      'SELECT id, titulo, descripcion, lugar, fecha, created_at FROM eventos WHERE id = ?',
      [idNumero]
    );

    if (!eventoExistente.result || eventoExistente.result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado',
      });
    }

    const { titulo, descripcion, lugar, fecha } = req.body;

    if (!titulo && !descripcion && !lugar && !fecha) {
      return res.status(400).json({
        success: false,
        message: 'Debe enviar al menos un campo para actualizar (titulo, descripcion, lugar, fecha)',
      });
    }

    // ── Validar datos recibidos ──
    if (titulo !== undefined) {
      if (typeof titulo !== 'string' || !titulo.trim()) {
        return res.status(400).json({
          success: false,
          message: 'El campo "titulo" no puede estar vacío',
        });
      }
      if (titulo.trim().length > 200) {
        return res.status(400).json({
          success: false,
          message: 'El título no puede superar los 200 caracteres',
        });
      }
    }

    if (fecha !== undefined) {
      if (!esFechaValida(fecha)) {
        return res.status(400).json({
          success: false,
          message: 'El campo "fecha" debe contener una fecha válida',
        });
      }
    }

    if (lugar !== undefined && lugar !== null) {
      if (typeof lugar === 'string' && lugar.trim().length > 200) {
        return res.status(400).json({
          success: false,
          message: 'El lugar no puede superar los 200 caracteres',
        });
      }
    }

    const eventoActual = eventoExistente.result[0];
    const nuevoTitulo = titulo !== undefined ? titulo.trim() : eventoActual.titulo;
    const nuevaDescripcion = descripcion !== undefined ? (descripcion ? String(descripcion).trim() : null) : eventoActual.descripcion;
    const nuevoLugar = lugar !== undefined ? (lugar ? String(lugar).trim() : null) : eventoActual.lugar;
    const nuevaFecha = fecha !== undefined ? formatearFechaSQL(fecha) : formatearFechaSQL(eventoActual.fecha);

    await databaseService.queryParams(
      'UPDATE eventos SET titulo = ?, descripcion = ?, lugar = ?, fecha = ? WHERE id = ?',
      [nuevoTitulo, nuevaDescripcion, nuevoLugar, nuevaFecha, idNumero]
    );

    const eventoActualizado = await databaseService.queryParams(
      'SELECT id, titulo, descripcion, lugar, fecha, created_at FROM eventos WHERE id = ?',
      [idNumero]
    );

    return res.json({
      success: true,
      data: eventoActualizado.result[0],
    });
  } catch (error) {
    console.error('Error al actualizar evento:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/**
 * DELETE /api/eventos/:id
 * Eliminar un evento existente (requiere JWT + rol admin).
 * Valida integridad referencial con la tabla entradas.
 */
async function eliminarEvento(req, res) {
  try {
    const { id } = req.params;
    const idNumero = parseInt(id, 10);

    if (isNaN(idNumero) || idNumero <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El ID del evento debe ser un número válido',
      });
    }

    // 1. Verificar existencia del evento
    const eventoExistente = await databaseService.queryParams(
      'SELECT id FROM eventos WHERE id = ?',
      [idNumero]
    );

    if (!eventoExistente.result || eventoExistente.result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado',
      });
    }

    // 2. Verificar dependencias (entradas asociadas al evento)
    const entradasAsociadas = await databaseService.queryParams(
      'SELECT id FROM entradas WHERE evento_id = ? LIMIT 1',
      [idNumero]
    );

    if (entradasAsociadas.result && entradasAsociadas.result.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'No se puede eliminar el evento porque tiene entradas asociadas',
      });
    }

    // 3. Eliminar evento
    await databaseService.queryParams(
      'DELETE FROM eventos WHERE id = ?',
      [idNumero]
    );

    return res.json({
      success: true,
      message: 'Evento eliminado correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar evento:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

module.exports = {
  obtenerEventos,
  obtenerEventoPorId,
  crearEvento,
  actualizarEvento,
  eliminarEvento,
};
