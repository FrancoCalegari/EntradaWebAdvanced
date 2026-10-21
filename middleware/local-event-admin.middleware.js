const { authenticate, authorize } = require('./auth.middleware');

function esLoopback(req) {
  const ip = String(
    req.ip || req.socket?.remoteAddress || ''
  ).replace(/^::ffff:/, '');

  return ip === '127.0.0.1' || ip === '::1';
}

function localEventAdmin(req, res, next) {
  const habilitado =
    process.env.NODE_ENV !== 'production' &&
    process.env.ALLOW_LOCAL_EVENT_ADMIN === 'true' &&
    esLoopback(req);

  if (habilitado) return next();

  return authenticate(req, res, (error) => {
    if (error) return next(error);

    return authorize('admin')(req, res, next);
  });
}

module.exports = localEventAdmin;
