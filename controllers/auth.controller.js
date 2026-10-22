// controllers/auth.controller.js
// Controlador de autenticación — Login con JWT.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const databaseService = require('../services/database');

function getJwtSecret() {
  return process.env.JWT_SECRET;
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '24h';
}

/**
 * POST /api/auth/login
 * Autenticar usuario y devolver JWT.
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // ── Validaciones ──

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El campo "email" es obligatorio',
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'El campo "password" es obligatorio',
      });
    }

    const secret = getJwtSecret();

    // ── Validar configuración JWT ──
    if (!secret) {
      console.error('JWT_SECRET no está configurado en las variables de entorno');
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }

    // ── Buscar usuario por email ──
    // Incluir password (hash) para comparación — NUNCA devolverlo al cliente
    const emailLimpio = email.trim().toLowerCase();

    const resultado = await databaseService.queryParams(
      'SELECT id, nombre, email, password, rol FROM usuarios WHERE email = ?',
      [emailLimpio]
    );

    if (!resultado.result || resultado.result.length === 0) {
      // Mensaje genérico — no indicar si el email existe o no
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
      });
    }

    const usuario = resultado.result[0];

    // ── Comparar contraseña con hash ──
    const passwordValido = await bcrypt.compare(password, usuario.password);

    if (!passwordValido) {
      // Mismo mensaje genérico — no revelar que el email existe
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
      });
    }

    // ── Generar JWT ──
    // Solo incluir información necesaria y segura
    const payload = {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };

    const token = jwt.sign(payload, secret, {
      expiresIn: getJwtExpiresIn(),
    });

    // ── Respuesta exitosa — NUNCA incluir password ──
    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
        },
      },
    });
  } catch (error) {
    console.error('Error en login:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

module.exports = {
  login,
};
