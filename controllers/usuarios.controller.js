// controllers/usuarios.controller.js
// Controlador para el módulo de usuarios.
// Maneja la lógica de negocio: validación, hashing, consultas SQL.

const bcrypt = require('bcryptjs');
const databaseService = require('../services/database');

// Cantidad de rondas de salt para bcrypt
const SALT_ROUNDS = 10;

// Longitud mínima de contraseña
const PASSWORD_MIN_LENGTH = 6;

// Roles permitidos en registro público
const ROLES_PERMITIDOS_REGISTRO = ['cliente'];

/**
 * Valida el formato de un email.
 * @param {string} email
 * @returns {boolean}
 */
function esEmailValido(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * POST /api/usuarios
 * Registrar un nuevo usuario.
 */
async function crearUsuario(req, res) {
  try {
    const { nombre, email, password } = req.body;

    // ── Validaciones ──

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El campo "nombre" es obligatorio',
      });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El campo "email" es obligatorio',
      });
    }

    if (!esEmailValido(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'El formato del email no es válido',
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'El campo "password" es obligatorio',
      });
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
      });
    }

    // ── Seguridad: forzar rol a 'cliente' ──
    // No permitir que un usuario se registre como admin
    const rol = 'cliente';

    // ── Verificar email único ──
    const emailLimpio = email.trim().toLowerCase();

    const existente = await databaseService.queryParams(
      'SELECT id FROM usuarios WHERE email = ?',
      [emailLimpio]
    );

    if (existente.result && existente.result.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'El email ya está registrado',
      });
    }

    // ── Hash de la contraseña ──
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // ── Insertar usuario ──
    const resultado = await databaseService.queryParams(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
      [nombre.trim(), emailLimpio, passwordHash, rol]
    );

    // Obtener el usuario creado (sin password)
    const nuevoUsuario = await databaseService.queryParams(
      'SELECT id, nombre, email, rol, created_at FROM usuarios WHERE id = ?',
      [resultado.result.insertId]
    );

    return res.status(201).json({
      success: true,
      data: nuevoUsuario.result[0],
    });
  } catch (error) {
    console.error('Error al crear usuario:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

/**
 * GET /api/usuarios/:id
 * Obtener información pública de un usuario.
 */
async function obtenerUsuario(req, res) {
  try {
    const { id } = req.params;

    // Validar que el id sea un número
    const idNumero = parseInt(id, 10);
    if (isNaN(idNumero) || idNumero <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El ID del usuario debe ser un número válido',
      });
    }

    // Consultar usuario — NUNCA incluir password
    const resultado = await databaseService.queryParams(
      'SELECT id, nombre, email, rol, created_at FROM usuarios WHERE id = ?',
      [idNumero]
    );

    if (!resultado.result || resultado.result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    return res.json({
      success: true,
      data: resultado.result[0],
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

module.exports = {
  crearUsuario,
  obtenerUsuario,
};
