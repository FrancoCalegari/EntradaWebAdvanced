// services/database.js
// Capa de servicio para consultas SQL a la base de datos de EntradaWeb.
// Utiliza el cliente centralizado de Spider-Web (spiderweb.client.js).
// No realiza peticiones HTTP propias ni duplica la API Key.

const spiderwebClient = require('./spiderweb.client');

const DB_NAME = process.env.SPIDERWEB_DB_NAME;

/**
 * Valida que el nombre de la base de datos esté configurado.
 * @throws {Error} Si SPIDERWEB_DB_NAME no está definida en .env
 */
function validarBaseDeDatos() {
  if (!DB_NAME) {
    throw new Error(
      'SPIDERWEB_DB_NAME no está configurada. Agregá el nombre de la base de datos en el archivo .env'
    );
  }
}

/**
 * Ejecuta una consulta SQL contra la base de datos de EntradaWeb.
 *
 * @param {string} sql - Consulta SQL a ejecutar
 * @returns {Promise<object>} Resultado de la consulta (objeto con success y result)
 * @throws {Error} Si la configuración es inválida o Spider-Web devuelve un error
 *
 * @example
 * // SELECT
 * const resultado = await query('SELECT * FROM usuarios');
 * // resultado.result → [{ id: 1, nombre: '...', ... }, ...]
 *
 * @example
 * // INSERT
 * const resultado = await query("INSERT INTO usuarios (nombre, email, password) VALUES ('Juan', 'juan@mail.com', '123')");
 * // resultado.result → { affectedRows: 1, insertId: 1, changedRows: 0 }
 */
async function query(sql) {
  validarBaseDeDatos();

  if (!sql || typeof sql !== 'string') {
    throw new Error('La consulta SQL es requerida y debe ser un string');
  }

  const response = await spiderwebClient.post('/query', {
    database: DB_NAME,
    query: sql,
  });

  return response;
}

/**
 * Ejecuta una consulta SQL parametrizada para prevenir inyección SQL.
 * Escapa los valores antes de insertarlos en la consulta.
 *
 * @param {string} sql - Consulta SQL con placeholders '?'
 * @param {Array} params - Valores a insertar en los placeholders
 * @returns {Promise<object>} Resultado de la consulta
 *
 * @example
 * const resultado = await queryParams(
 *   'SELECT * FROM usuarios WHERE email = ? AND nombre = ?',
 *   ['juan@mail.com', 'Juan']
 * );
 */
async function queryParams(sql, params = []) {
  if (!Array.isArray(params)) {
    throw new Error('Los parámetros deben ser un array');
  }

  // Reemplazar cada '?' con el valor escapado correspondiente
  let index = 0;
  const sqlFinal = sql.replace(/\?/g, () => {
    if (index >= params.length) {
      throw new Error('Faltan parámetros para los placeholders en la consulta');
    }
    const valor = params[index++];
    return escaparValor(valor);
  });

  if (index !== params.length) {
    throw new Error('Sobran parámetros para los placeholders en la consulta');
  }

  return query(sqlFinal);
}

/**
 * Escapa un valor para uso seguro en consultas SQL.
 *
 * @param {*} valor - Valor a escapar
 * @returns {string} Valor escapado y entrecomillado si corresponde
 */
function escaparValor(valor) {
  if (valor === null || valor === undefined) {
    return 'NULL';
  }

  if (typeof valor === 'number') {
    return String(valor);
  }

  if (typeof valor === 'boolean') {
    return valor ? '1' : '0';
  }

  // Strings: escapar comillas simples y caracteres peligrosos
  const escaped = String(valor)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\0/g, '\\0');

  return `'${escaped}'`;
}

module.exports = {
  query,
  queryParams,
};
