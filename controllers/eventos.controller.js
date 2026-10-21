
 // controllers/eventos.controller.js
// CRUD de eventos con compatibilidad para titulo/nombre y precio_min/precio.

const databaseService = require('../services/database');

const ESTADOS_EVENTO = ['disponible', 'agotado', 'proximo', 'cancelado'];

const COLUMNAS_EVENTO = `
  id, titulo, descripcion, lugar, fecha,
  imagen, categoria, precio_min, estado, created_at
`;

function esFechaValida(fecha) {
  if (!(typeof fecha === 'string' || fecha instanceof Date)) return false;
  if (typeof fecha === 'string' && !fecha.trim()) return false;
  return !Number.isNaN(Date.parse(fecha));
}

function formatearFechaSQL(fecha) {
  const d = new Date(fecha);

  if (Number.isNaN(d.getTime())) {
    throw new Error('Fecha inválida');
  }

  const pad = (n) => String(n).padStart(2, '0');

  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function formatearEventoParaRespuesta(ev) {
  if (!ev) return ev;

  return {
    ...ev,
    nombre: ev.titulo,
    precio: ev.precio_min !== undefined && ev.precio_min !== null
      ? Number(ev.precio_min)
      : 0,
  };
}

function validarIdEvento(id) {
  const numero = Number.parseInt(id, 10);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function normalizarTextoOpcional(valor) {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  if (typeof valor !== 'string') return null;

  return valor.trim() || null;
}

function validarPrecio(valor) {
  if (valor === undefined) return { valido: true, valor: undefined };
  if (valor === null || valor === '') return { valido: false };

  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0) {
    return { valido: false };
  }

  return { valido: true, valor: numero };
}

function validarCamposEvento(body, { crear = false } = {}) {
  const tituloEntrada = body.titulo !== undefined
    ? body.titulo
    : body.nombre;

  if (
    crear &&
    (typeof tituloEntrada !== 'string' || !tituloEntrada.trim())
  ) {
    return { error: 'El campo "titulo" o "nombre" es obligatorio' };
  }

  if (tituloEntrada !== undefined) {
    if (typeof tituloEntrada !== 'string' || !tituloEntrada.trim()) {
      return { error: 'El título no puede estar vacío' };
    }

    if (tituloEntrada.trim().length > 200) {
      return { error: 'El título no puede superar los 200 caracteres' };
    }
  }

  if (crear && !body.fecha) {
    return { error: 'El campo "fecha" es obligatorio' };
  }

  if (body.fecha !== undefined && !esFechaValida(body.fecha)) {
    return { error: 'El campo "fecha" debe contener una fecha válida' };
  }

  if (
    body.lugar !== undefined &&
    body.lugar !== null &&
    typeof body.lugar !== 'string'
  ) {
    return { error: 'El lugar debe ser una cadena de texto' };
  }

  if (typeof body.lugar === 'string' && body.lugar.trim().length > 200) {
    return { error: 'El lugar no puede superar los 200 caracteres' };
  }

  if (
    body.imagen !== undefined &&
    body.imagen !== null &&
    typeof body.imagen !== 'string'
  ) {
    return { error: 'La imagen debe ser una cadena de texto' };
  }

  if (typeof body.imagen === 'string' && body.imagen.trim().length > 500) {
    return { error: 'La imagen no puede superar los 500 caracteres' };
  }

  if (
    body.categoria !== undefined &&
    body.categoria !== null &&
    typeof body.categoria !== 'string'
  ) {
    return { error: 'La categoría debe ser una cadena de texto' };
  }

  if (
    typeof body.categoria === 'string' &&
    body.categoria.trim().length > 50
  ) {
    return { error: 'La categoría no puede superar los 50 caracteres' };
  }

  const precioEntrada = body.precio_min !== undefined
    ? body.precio_min
    : body.precio;

  const precioValidado = validarPrecio(precioEntrada);

  if (!precioValidado.valido) {
    return {
      error: 'El precio mínimo debe ser un número mayor o igual a cero',
    };
  }

  if (
    body.estado !== undefined &&
    !ESTADOS_EVENTO.includes(body.estado)
  ) {
    return {
      error: `El estado debe ser uno de estos valores: ${ESTADOS_EVENTO.join(', ')}`,
    };
  }

  return {
    valor: {
      titulo: tituloEntrada !== undefined
        ? tituloEntrada.trim()
        : undefined,

      descripcion: body.descripcion !== undefined
        ? (body.descripcion == null
          ? null
          : String(body.descripcion).trim() || null)
        : undefined,

      lugar: body.lugar !== undefined
        ? (body.lugar === null ? null : body.lugar.trim() || null)
        : undefined,

      fecha: body.fecha !== undefined
        ? formatearFechaSQL(body.fecha)
        : undefined,

      imagen: normalizarTextoOpcional(body.imagen),
      categoria: normalizarTextoOpcional(body.categoria),
      precio_min: precioValidado.valor,
      estado: body.estado,
    },
  };
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
 * Lista eventos por fecha; admite ?limit=N.
 */
async function obtenerEventos(req, res) {
  try {
    let sql = `SELECT ${COLUMNAS_EVENTO} FROM eventos ORDER BY fecha ASC`;
    const params = [];
    const limit = Number.parseInt(req.query.limit, 10);

    if (Number.isInteger(limit) && limit > 0) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    const resultado = params.length
      ? await databaseService.queryParams(sql, params)
      : await databaseService.query(sql);

    return res.json({
      success: true,
      data: (resultado.result || []).map(formatearEventoParaRespuesta),
    });
  } catch (error) {
    console.error('Error al obtener eventos:', error);

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/** GET /api/eventos/:id */
async function obtenerEventoPorId(req, res) {
  try {
    const idNumero = validarIdEvento(req.params.id);

    if (!idNumero) {
      return res.status(400).json({
        success: false,
        message: 'El ID del evento debe ser un número válido',
      });
    }

    const resultado = await databaseService.queryParams(
      `SELECT ${COLUMNAS_EVENTO} FROM eventos WHERE id = ?`,
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

/** POST /api/eventos */
async function crearEvento(req, res) {
  try {
    const validacion = validarCamposEvento(req.body || {}, { crear: true });

    if (validacion.error) {
      return res.status(400).json({
        success: false,
        message: validacion.error,
      });
    }

    const ev = validacion.valor;

    const resultado = await databaseService.queryParams(
      `INSERT INTO eventos
        (titulo, descripcion, lugar, fecha, imagen, categoria, precio_min, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ev.titulo,
        ev.descripcion ?? null,
        ev.lugar ?? null,
        ev.fecha,
        ev.imagen ?? null,
        ev.categoria ?? null,
        ev.precio_min ?? 0,
        ev.estado ?? 'disponible',
      ]
    );

    const nuevoId = resultado.result?.insertId;

    if (!nuevoId) {
      throw new Error('No se pudo obtener el ID del evento creado');
    }

    const eventoCreado = await databaseService.queryParams(
      `SELECT ${COLUMNAS_EVENTO} FROM eventos WHERE id = ?`,
      [nuevoId]
    );

    const evento = eventoCreado.result?.[0] || {
      id: nuevoId,
      titulo: ev.titulo,
      descripcion: ev.descripcion ?? null,
      lugar: ev.lugar ?? null,
      fecha: ev.fecha,
      imagen: ev.imagen ?? null,
      categoria: ev.categoria ?? null,
      precio_min: ev.precio_min ?? 0,
      estado: ev.estado ?? 'disponible',
    };

    return res.status(201).json({
      success: true,
      data: formatearEventoParaRespuesta(evento),
    });
  } catch (error) {
    console.error('Error al crear evento:', error);

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/** PUT /api/eventos/:id */
async function actualizarEvento(req, res) {
  try {
    const idNumero = validarIdEvento(req.params.id);

    if (!idNumero) {
      return res.status(400).json({
        success: false,
        message: 'El ID del evento debe ser un número válido',
      });
    }

    const eventoExistente = await databaseService.queryParams(
      `SELECT ${COLUMNAS_EVENTO} FROM eventos WHERE id = ?`,
      [idNumero]
    );

    if (!eventoExistente.result || eventoExistente.result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado',
      });
    }

    const body = req.body || {};

    const camposPermitidos = [
      'titulo',
      'nombre',
      'descripcion',
      'lugar',
      'fecha',
      'imagen',
      'categoria',
      'precio',
      'precio_min',
      'estado',
    ];

    if (!camposPermitidos.some((campo) => body[campo] !== undefined)) {
      return res.status(400).json({
        success: false,
        message: 'Debe enviar al menos un campo para actualizar',
      });
    }

    const validacion = validarCamposEvento(body);

    if (validacion.error) {
      return res.status(400).json({
        success: false,
        message: validacion.error,
      });
    }

    const actual = eventoExistente.result[0];
    const ev = validacion.valor;

    const nuevoTitulo = ev.titulo !== undefined
      ? ev.titulo
      : actual.titulo;

    const nuevaDescripcion = ev.descripcion !== undefined
      ? ev.descripcion
      : actual.descripcion;

    const nuevoLugar = ev.lugar !== undefined
      ? ev.lugar
      : actual.lugar;

    const nuevaFecha = ev.fecha !== undefined
      ? ev.fecha
      : formatearFechaSQL(actual.fecha);

    const nuevaImagen = ev.imagen !== undefined
      ? ev.imagen
      : actual.imagen ?? null;

    const nuevaCategoria = ev.categoria !== undefined
      ? ev.categoria
      : actual.categoria ?? null;

    const nuevoPrecio = ev.precio_min !== undefined
      ? ev.precio_min
      : Number(actual.precio_min ?? 0);

    const nuevoEstado = ev.estado !== undefined
      ? ev.estado
      : (actual.estado || 'disponible');

    await databaseService.queryParams(
      `UPDATE eventos
       SET titulo = ?, descripcion = ?, lugar = ?, fecha = ?,
           imagen = ?, categoria = ?, precio_min = ?, estado = ?
       WHERE id = ?`,
      [
        nuevoTitulo,
        nuevaDescripcion,
        nuevoLugar,
        nuevaFecha,
        nuevaImagen,
        nuevaCategoria,
        nuevoPrecio,
        nuevoEstado,
        idNumero,
      ]
    );

    const eventoActualizado = await databaseService.queryParams(
      `SELECT ${COLUMNAS_EVENTO} FROM eventos WHERE id = ?`,
      [idNumero]
    );

    const evento = eventoActualizado.result?.[0] || {
      id: idNumero,
      titulo: nuevoTitulo,
      descripcion: nuevaDescripcion,
      lugar: nuevoLugar,
      fecha: nuevaFecha,
      imagen: nuevaImagen,
      categoria: nuevaCategoria,
      precio_min: nuevoPrecio,
      estado: nuevoEstado,
    };

    return res.json({
      success: true,
      data: formatearEventoParaRespuesta(evento),
    });
  } catch (error) {
    console.error('Error al actualizar evento:', error);

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/** DELETE /api/eventos/:id */
async function eliminarEvento(req, res) {
  try {
    const idNumero = validarIdEvento(req.params.id);

    if (!idNumero) {
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
