// services/spiderweb.client.js
// Cliente centralizado para comunicación con Spider-Web ARG API
// Todas las peticiones pasan por este módulo.

const SPIDERWEB_API_URL = process.env.SPIDERWEB_API_URL;
const SPIDERWEB_API_KEY = process.env.SPIDERWEB_API_KEY;

// Timeout en milisegundos para las peticiones a Spider-Web
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Valida que las variables de entorno necesarias estén configuradas.
 * Lanza un error descriptivo si falta alguna.
 */
function validarConfiguracion() {
  if (!SPIDERWEB_API_URL) {
    throw new Error(
      'SPIDERWEB_API_URL no está configurada. Revisá el archivo .env'
    );
  }

  if (!SPIDERWEB_API_KEY) {
    throw new Error(
      'SPIDERWEB_API_KEY no está configurada. Agregá tu API Key en el archivo .env'
    );
  }
}

/**
 * Realiza una petición HTTP a Spider-Web ARG API.
 *
 * @param {string} endpoint - Ruta relativa (ej: '/databases')
 * @param {object} [options={}] - Opciones adicionales para fetch (method, body, etc.)
 * @returns {Promise<object>} Respuesta parseada como JSON
 * @throws {Error} Si la configuración es inválida, hay timeout, o Spider-Web responde con error
 */
async function request(endpoint, options = {}) {
  validarConfiguracion();

  const url = `${SPIDERWEB_API_URL}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers = {
      'X-API-KEY': SPIDERWEB_API_KEY,
      ...options.headers,
    };

    // Si el body no es FormData y no se especificó Content-Type, usar application/json por defecto
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Sin detalle');
      throw new Error(
        `Spider-Web respondió con status ${response.status}: ${errorBody}`
      );
    }

    // Parsear respuesta JSON
    const data = await response.json();
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        `Timeout: Spider-Web no respondió en ${REQUEST_TIMEOUT_MS / 1000} segundos`
      );
    }

    if (error.message.startsWith('Spider-Web respondió')) {
      throw error;
    }

    throw new Error(
      `Error de conexión con Spider-Web: ${error.message}`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Petición GET a Spider-Web API
 */
async function get(endpoint) {
  return request(endpoint, { method: 'GET' });
}

/**
 * Petición POST a Spider-Web API
 */
async function post(endpoint, body) {
  return request(endpoint, {
    method: 'POST',
    body: typeof body === 'object' && !(body instanceof FormData) ? JSON.stringify(body) : body,
  });
}

/**
 * Petición PUT a Spider-Web API
 */
async function put(endpoint, body) {
  return request(endpoint, {
    method: 'PUT',
    body: typeof body === 'object' && !(body instanceof FormData) ? JSON.stringify(body) : body,
  });
}

/**
 * Petición DELETE a Spider-Web API
 */
async function del(endpoint) {
  return request(endpoint, { method: 'DELETE' });
}

module.exports = {
  request,
  get,
  post,
  put,
  del,
};
