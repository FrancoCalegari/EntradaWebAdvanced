
 // controllers/eventos.controller.js
// Controlador CRUD del módulo de eventos.

const databaseService = require('../services/database');

/**
 * Comprueba si una fecha es válida.
 */
function esFechaValida(fecha) {
  if (typeof fecha !== 'string' && !(fecha instanceof Date)) {
    return false;
  }

  if (typeof fecha === 'string' && !fecha.trim()) {
    return false;
  }

  const timestamp = Date.parse(fecha);
  return !Number.isNaN(timestamp);
}

/**
 * Convierte una fecha al formato SQL YYYY-MM-DD HH:MM:SS.
 */
function formatearFechaSQL(fecha) {
  const d = new Date(fecha);

  if (Number.isNaN(d.getTime())) {
    throw new Error('Fecha inválida');
  }

  const pad = (n) => String(n).padStart(2, '0');

  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate()
  )} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(
    d.getUTCSeconds()
  )}`;
}

/**
 * Normaliza el objeto evento para que sea 100% compatible con cualquier frontend
 * que espere 'titulo' o 'nombre', 'precio_min' o 'precio'.
 */
function formatearEventoParaRespuesta(ev) {
  if (!ev) return ev;
  return {
    ...ev,
    nombre: ev.titulo,
    precio: ev.precio_min !== undefined ? Number(ev.precio_min) : 0,
  };
}

/**
 * GET /api/eventos
 * Lista todos los eventos ordenados por fecha.
 */
async function obtenerEventos(req, res) {
  try {
    // Soporte para ?limit=N desde el frontend (ej: home.js pide ?limit=8)
    let sql = 'SELECT id, titulo, descripcion, lugar, fecha, imagen, categoria, precio_min, estado, created_at FROM eventos ORDER BY fecha ASC';
    const params = [];

    const limit = parseInt(req.query.limit, 10);
    if (!isNaN(limit) && limit > 0) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    const resultado = params.length > 0
      ? await databaseService.queryParams(sql, params)
      : await databaseService.query(sql);

    const eventos = (resultado.result || []).map(formatearEventoParaRespuesta);

    return res.json({
      success: true,
      data: eventos,
    });
  } catch (error) {
    console.error('ERROR COMPLETO AL OBTENER EVENTOS:', error);

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/**
 * GET /api/eventos/:id
 * Obtiene un evento por su ID.
 */
async function obtenerEventoPorId(req, res) {
  try {
    const idNumero = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(idNumero) || idNumero <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El ID del evento debe ser un número válido',
      });
    }

    const resultado = await databaseService.queryParams(
      'SELECT id, titulo, descripcion, lugar, fecha, imagen, categoria, precio_min, estado, created_at FROM eventos WHERE id = ?',
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
      data: formatearEventoParaRespuesta(resultado.result[0]),
    });
  } catch (error) {
    console.error('Error al obtener evento por ID:', error);

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/**
 * POST /api/eventos
 * Crea un evento.
 * La protección de acceso depende de la configuración de las rutas.
 */
async function crearEvento(req, res) {
  try {
    const {
      titulo,
      nombre,
      descripcion,
      lugar,
      fecha,
      imagen,
      categoria,
      precio,
      precio_min,
      estado,
    } = req.body;

    const tituloFinal = (titulo || nombre || '').trim();

    if (typeof titulo !== 'string' || !titulo.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El título o nombre del evento es obligatorio',
      });
    }

    if (tituloFinal.length > 200) {
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
        message: 'El campo "fecha" debe contener una fecha válida',
      });
    }

    if (
      lugar !== undefined &&
      lugar !== null &&
      typeof lugar !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'El lugar debe ser una cadena de texto',
      });
    }

    if (typeof lugar === 'string' && lugar.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message: 'El lugar no puede superar los 200 caracteres',
      });
    }

    const tituloLimpio = titulo.trim();

    const descripcionLimpia =
      descripcion == null
        ? null
        : String(descripcion).trim() || null;

    const lugarLimpio =
      typeof lugar === 'string' ? lugar.trim() || null : null;

    const fechaSQL = formatearFechaSQL(fecha);
    const imagenLimpia = imagen ? String(imagen).trim() : null;
    const categoriaLimpia = categoria ? String(categoria).trim() : null;
    const precioFinal = precio_min !== undefined ? Number(precio_min) : (precio !== undefined ? Number(precio) : 0);
    const estadoValido = ['disponible', 'agotado', 'proximo', 'cancelado'].includes(estado) ? estado : 'disponible';

    const resultado = await databaseService.queryParams(
      'INSERT INTO eventos (titulo, descripcion, lugar, fecha, imagen, categoria, precio_min, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [tituloFinal, descripcionLimpia, lugarLimpio, fechaSQL, imagenLimpia, categoriaLimpia, precioFinal, estadoValido]
    );

    const nuevoId = resultado.result?.insertId;

    if (!nuevoId) {
      throw new Error('No se pudo obtener el ID del evento creado');
    }

    const eventoCreado = await databaseService.queryParams(
      'SELECT id, titulo, descripcion, lugar, fecha, imagen, categoria, precio_min, estado, created_at FROM eventos WHERE id = ?',
      [nuevoId]
    );

    return res.status(201).json({
      success: true,
      data: eventoCreado.result?.[0] || {
        id: nuevoId,
        titulo: tituloLimpio,
        descripcion: descripcionLimpia,
        lugar: lugarLimpio,
        fecha: fechaSQL,
      },
    });
  } catch (error) {
    console.error('Error al crear evento:', error);

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/**
 * PUT /api/eventos/:id
 * Actualiza un evento existente.
 */
async function actualizarEvento(req, res) {
  try {
    const idNumero = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(idNumero) || idNumero <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El ID del evento debe ser un número válido',
      });
    }

    const eventoExistente = await databaseService.queryParams(
      'SELECT id, titulo, descripcion, lugar, fecha, imagen, categoria, precio_min, estado, created_at FROM eventos WHERE id = ?',
      [idNumero]
    );

    if (!eventoExistente.result || eventoExistente.result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado',
      });
    }

    const { titulo, descripcion, lugar, fecha } = req.body;

    if (
      titulo === undefined &&
      descripcion === undefined &&
      lugar === undefined &&
      fecha === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'Debe enviar al menos un campo para actualizar',
      });
    }

    if (titulo !== undefined) {
      if (typeof titulo !== 'string' || !titulo.trim()) {
        return res.status(400).json({
          success: false,
          message: 'El título no puede estar vacío',
        });
      }

      if (titulo.trim().length > 200) {
        return res.status(400).json({
          success: false,
          message: 'El título no puede superar los 200 caracteres',
        });
      }
    }

    if (fecha !== undefined && !esFechaValida(fecha)) {
      return res.status(400).json({
        success: false,
        message: 'El campo "fecha" debe contener una fecha válida',
      });
    }

    if (
      lugar !== undefined &&
      lugar !== null &&
      typeof lugar !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'El lugar debe ser una cadena de texto',
      });
    }

    if (typeof lugar === 'string' && lugar.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message: 'El lugar no puede superar los 200 caracteres',
      });
    }

    const eventoActual = eventoExistente.result[0];

    const nuevoTitulo =
      titulo !== undefined ? titulo.trim() : eventoActual.titulo;

    const nuevaDescripcion =
      descripcion !== undefined
        ? descripcion == null
          ? null
          : String(descripcion).trim() || null
        : eventoActual.descripcion;

    const nuevoLugar =
      lugar !== undefined
        ? typeof lugar === 'string'
          ? lugar.trim() || null
          : null
        : eventoActual.lugar;

    const nuevaFecha =
      fecha !== undefined
        ? formatearFechaSQL(fecha)
        : formatearFechaSQL(eventoActual.fecha);

    await databaseService.queryParams(
      'UPDATE eventos SET titulo = ?, descripcion = ?, lugar = ?, fecha = ? WHERE id = ?',
      [
        nuevoTitulo,
        nuevaDescripcion,
        nuevoLugar,
        nuevaFecha,
        idNumero,
      ]
    );

    const eventoActualizado = await databaseService.queryParams(
      'SELECT id, titulo, descripcion, lugar, fecha, imagen, categoria, precio_min, estado, created_at FROM eventos WHERE id = ?',
      [idNumero]
    );

    return res.json({
      success: true,
      data: eventoActualizado.result?.[0] || {
        id: idNumero,
        titulo: nuevoTitulo,
        descripcion: nuevaDescripcion,
        lugar: nuevoLugar,
        fecha: nuevaFecha,
      },
    });
  } catch (error) {
    console.error('Error al actualizar evento:', error);

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/**
 * DELETE /api/eventos/:id
 * Elimina un evento si no tiene entradas asociadas.
 */
async function eliminarEvento(req, res) {
  try {
    const idNumero = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(idNumero) || idNumero <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El ID del evento debe ser un número válido',
      });
    }

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

    const entradasAsociadas = await databaseService.queryParams(
      'SELECT id FROM entradas WHERE evento_id = ? LIMIT 1',
      [idNumero]
    );

    if (entradasAsociadas.result?.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'No se puede eliminar el evento porque tiene entradas asociadas',
      });
    }

    await databaseService.queryParams(
      'DELETE FROM eventos WHERE id = ?',
      [idNumero]
    );

    return res.json({
      success: true,
      message: 'Evento eliminado correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar evento:', error);

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
