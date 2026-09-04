// middleware/auth.middleware.js
// Middleware de autenticación (JWT) y autorización por rol.

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware de autenticación.
 * Verifica el token JWT del header Authorization.
 * Si es válido, coloca la información del usuario en req.user.
 *
 * Uso:
 *   app.get('/ruta-protegida', authenticate, handler);
 */
function authenticate(req, res, next) {
  // Validar configuración
  if (!JWT_SECRET) {
    console.error('JWT_SECRET no está configurado en .env');
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }

  // Leer header Authorization
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Acceso no autorizado. Token no proporcionado',
    });
  }

  // Formato esperado: "Bearer TOKEN"
  const partes = authHeader.split(' ');

  if (partes.length !== 2 || partes[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      message: 'Formato de token inválido. Usar: Bearer TOKEN',
    });
  }

  const token = partes[1];

  try {
    // Verificar y decodificar el JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    // Colocar información del usuario en req.user
    req.user = {
      id: decoded.id,
      email: decoded.email,
      rol: decoded.rol,
    };

    next();
  } catch (error) {
    // No revelar detalles internos del error
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token inválido',
    });
  }
}

/**
 * Middleware de autorización por rol.
 * Verifica que el usuario autenticado tenga uno de los roles permitidos.
 * Debe usarse DESPUÉS de authenticate.
 *
 * Uso:
 *   app.get('/admin', authenticate, authorize('admin'), handler);
 *   app.get('/ambos', authenticate, authorize('cliente', 'admin'), handler);
 *
 * @param  {...string} roles - Roles permitidos
 * @returns {Function} Middleware de Express
 */
function authorize(...roles) {
  return (req, res, next) => {
    // Verificar que authenticate haya sido ejecutado previamente
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acceso no autorizado',
      });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'No tenés permisos para acceder a este recurso',
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize,
};
