/**
 * ENTRADAWEB — Módulo de Validación de Formularios Accesible (form-validation.js)
 * Rol: Santiago Morales (Frontend)
 *
 * Implementa:
 * - Validación en tiempo real (al salir del campo) y al enviar
 * - Mensajes de error accesibles: visibles, con ícono (no solo color),
 *   enlazados al campo con aria-describedby (WCAG 1.4.1 — Use of Color)
 * - aria-invalid en campos con error (WCAG 4.1.2 — Name, Role, Value)
 * - Resumen de errores al intentar enviar (WCAG 3.3.1 — Error Identification)
 * - Foco automático en el primer campo con error (WCAG 3.3.3 — Error Suggestion)
 * - Mensajes de éxito accesibles
 *
 * USO:
 *   const validator = new EWFormValidator('#mi-formulario', {
 *     onSuccess: (formData) => { ... }
 *   });
 */

class EWFormValidator {
  /**
   * @param {string|HTMLFormElement} formSelector
   * @param {object} options
   * @param {function} [options.onSuccess] - Callback al enviar exitosamente
   * @param {boolean}  [options.validateOnBlur=true] - Validar al salir del campo
   * @param {boolean}  [options.validateOnInput=false] - Validar mientras escribe
   */
  constructor(formSelector, options = {}) {
    this.form = typeof formSelector === 'string'
      ? document.querySelector(formSelector)
      : formSelector;

    if (!this.form) return;

    this.options = {
      onSuccess:       options.onSuccess || null,
      validateOnBlur:  options.validateOnBlur !== false,
      validateOnInput: options.validateOnInput || false,
    };

    this._init();
  }

  /* ─── REGLAS DE VALIDACIÓN ──────────────────────────────────── */

  static RULES = {
    required: {
      validate: (value) => value.trim() !== '',
      message:  'Este campo es obligatorio.',
    },
    email: {
      validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
      message:  'Ingresá un correo electrónico válido (ej: nombre@correo.com).',
    },
    minLength: (min) => ({
      validate: (value) => value.trim().length >= min,
      message:  `Debe tener al menos ${min} caracteres.`,
    }),
    maxLength: (max) => ({
      validate: (value) => value.trim().length <= max,
      message:  `No puede superar los ${max} caracteres.`,
    }),
    phone: {
      validate: (value) => /^[\d\s\-\+\(\)]{7,15}$/.test(value.trim()),
      message:  'Ingresá un número de teléfono válido.',
    },
    numeric: {
      validate: (value) => /^\d+$/.test(value.trim()),
      message:  'Este campo solo acepta números.',
    },
    dni: {
      validate: (value) => /^\d{7,8}$/.test(value.replace(/\D/g, '')),
      message:  'Ingresá un DNI válido (7 u 8 dígitos).',
    },
    cardNumber: {
      validate: (value) => /^\d{13,19}$/.test(value.replace(/\s/g, '')),
      message:  'Número de tarjeta inválido.',
    },
    cardExpiry: {
      validate: (value) => {
        const match = value.match(/^(\d{2})\/(\d{2,4})$/);
        if (!match) return false;
        const month = parseInt(match[1], 10);
        const year  = parseInt(match[2].length === 2 ? '20' + match[2] : match[2], 10);
        const now   = new Date();
        const expiry = new Date(year, month - 1, 1);
        return month >= 1 && month <= 12 && expiry >= new Date(now.getFullYear(), now.getMonth(), 1);
      },
      message: 'Ingresá una fecha de vencimiento válida (MM/AA).',
    },
    cvv: {
      validate: (value) => /^\d{3,4}$/.test(value.trim()),
      message:  'El CVV debe tener 3 o 4 dígitos.',
    },
  };

  /* ─── INICIALIZACIÓN ────────────────────────────────────────── */

  _init() {
    // Desactivar validación nativa del navegador (la nuestra es más accesible)
    this.form.setAttribute('novalidate', '');

    if (this.options.validateOnBlur) {
      this.form.addEventListener('focusout', (e) => {
        const field = e.target.closest('[data-validate]');
        if (field) this._validateField(field);
      });
    }

    if (this.options.validateOnInput) {
      this.form.addEventListener('input', (e) => {
        const field = e.target.closest('[data-validate]');
        // Solo validar si el campo ya fue tocado (tiene estado de error o éxito)
        if (field && field.dataset.touched === 'true') {
          this._validateField(field);
        }
      });
    }

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this._handleSubmit();
    });
  }

  /* ─── VALIDAR UN CAMPO INDIVIDUAL ──────────────────────────── */

  _validateField(field) {
    const input   = field.querySelector('input, select, textarea');
    if (!input) return true;

    field.dataset.touched = 'true';

    const rulesAttr = field.dataset.validate || '';
    const rules     = this._parseRules(rulesAttr);
    const value     = input.value;

    for (const rule of rules) {
      if (!rule.validate(value)) {
        this._showError(field, input, rule.message);
        return false;
      }
    }

    this._clearError(field, input);
    return true;
  }

  /* ─── PARSEAR REGLAS DESDE data-validate ───────────────────── */

  _parseRules(rulesStr) {
    return rulesStr.split('|').map(rulePart => {
      const [name, arg] = rulePart.split(':');
      const rule = EWFormValidator.RULES[name.trim()];
      if (!rule) return null;
      return typeof rule === 'function' ? rule(parseInt(arg, 10)) : rule;
    }).filter(Boolean);
  }

  /* ─── MOSTRAR ERROR ─────────────────────────────────────────── */

  _showError(field, input, message) {
    input.classList.add('form-input--error');
    input.setAttribute('aria-invalid', 'true');

    let errorEl = field.querySelector('[data-error-msg]');

    if (!errorEl) {
      // Crear el elemento de error si no existe
      errorEl = document.createElement('span');
      errorEl.setAttribute('data-error-msg', '');
      errorEl.setAttribute('role', 'alert');
      // ID único para aria-describedby
      const errorId = `error-${input.id || Math.random().toString(36).slice(2)}`;
      errorEl.id    = errorId;
      field.appendChild(errorEl);

      // Enlazar el input al mensaje de error
      const existing = input.getAttribute('aria-describedby') || '';
      if (!existing.includes(errorId)) {
        input.setAttribute('aria-describedby', [existing, errorId].filter(Boolean).join(' '));
      }
    }

    // Ícono + texto (WCAG 1.4.1 — no solo color)
    errorEl.className = 'form-error';
    errorEl.innerHTML = `<span aria-hidden="true">⚠</span> ${message}`;
  }

  /* ─── LIMPIAR ERROR ─────────────────────────────────────────── */

  _clearError(field, input) {
    input.classList.remove('form-input--error');
    input.removeAttribute('aria-invalid');

    const errorEl = field.querySelector('[data-error-msg]');
    if (errorEl) {
      // Limpiar aria-describedby
      const desc = input.getAttribute('aria-describedby') || '';
      input.setAttribute(
        'aria-describedby',
        desc.replace(errorEl.id, '').trim()
      );
      errorEl.remove();
    }
  }

  /* ─── MANEJAR ENVÍO DEL FORMULARIO ─────────────────────────── */

  _handleSubmit() {
    const fields = Array.from(this.form.querySelectorAll('[data-validate]'));
    let firstInvalidField = null;

    const allValid = fields.every(field => {
      const isValid = this._validateField(field);
      if (!isValid && !firstInvalidField) {
        firstInvalidField = field;
      }
      return isValid;
    });

    if (!allValid) {
      // Dar foco al primer campo inválido (WCAG 3.3.3)
      if (firstInvalidField) {
        const input = firstInvalidField.querySelector('input, select, textarea');
        if (input) input.focus();
      }

      // Anuncio de error global para lectores de pantalla
      if (window.ewAnnounce) {
        const errorCount = fields.filter(f => f.querySelector('[data-error-msg]')).length;
        window.ewAnnounce(
          `Hay ${errorCount} error${errorCount !== 1 ? 'es' : ''} en el formulario. Por favor revisá los campos marcados.`,
          'assertive'
        );
      }
      return;
    }

    // Éxito: recopilar datos
    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData.entries());

    if (window.ewAnnounce) {
      window.ewAnnounce('Formulario enviado correctamente.', 'polite');
    }

    if (this.options.onSuccess) {
      this.options.onSuccess(data);
    }
  }

  /* ─── API PÚBLICA ───────────────────────────────────────────── */

  /** Valida todos los campos del formulario manualmente */
  validate() {
    const fields = Array.from(this.form.querySelectorAll('[data-validate]'));
    return fields.every(field => this._validateField(field));
  }

  /** Limpia todos los errores del formulario */
  reset() {
    this.form.querySelectorAll('[data-validate]').forEach(field => {
      const input = field.querySelector('input, select, textarea');
      if (input) this._clearError(field, input);
      delete field.dataset.touched;
    });
  }
}

// Exponer globalmente
window.EWFormValidator = EWFormValidator;

/* ─── AUTO-INICIALIZACIÓN ─────────────────────────────────────── */
// Inicializa automáticamente formularios con data-ew-validate
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form[data-ew-validate]').forEach(form => {
    new EWFormValidator(form, {
      validateOnBlur: true,
      validateOnInput: true,
    });
  });
});
