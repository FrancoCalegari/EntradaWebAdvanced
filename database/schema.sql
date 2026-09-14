-- Esquema de datos de EntradaWeb para MySQL/MariaDB.
-- Todas las sentencias son idempotentes para permitir volver a ejecutar db:init.

CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol ENUM('cliente', 'admin') NOT NULL DEFAULT 'cliente',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eventos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT NULL,
  lugar VARCHAR(200) NULL,
  fecha DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_eventos_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entradas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  evento_id INT UNSIGNED NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  precio DECIMAL(10, 2) NOT NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_entradas_evento_id (evento_id),
  CONSTRAINT fk_entradas_evento
    FOREIGN KEY (evento_id) REFERENCES eventos (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS compras (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  estado ENUM('pendiente', 'completada', 'cancelada') NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_compras_usuario_id (usuario_id),
  KEY idx_compras_created_at (created_at),
  CONSTRAINT fk_compras_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS detalle_compras (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  compra_id INT UNSIGNED NOT NULL,
  entrada_id INT UNSIGNED NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  precio_unitario DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_detalle_compra_entrada (compra_id, entrada_id),
  KEY idx_detalle_entrada_id (entrada_id),
  CONSTRAINT fk_detalle_compra
    FOREIGN KEY (compra_id) REFERENCES compras (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_detalle_entrada
    FOREIGN KEY (entrada_id) REFERENCES entradas (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;