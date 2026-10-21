/**
 * ENTRADAWEB — Módulo de Accesibilidad (a11y.js)
 * Rol: Santiago Morales (Frontend)
 *
 * Módulo reutilizable que se carga en TODAS las páginas.
 * Implementa:
 *
 * 1. NAVEGACIÓN POR TECLADO (WCAG 2.4.3 — Focus Order, 2.4.7 — Focus Visible)
 *    - Detección de modo teclado vs. mouse para mostrar/ocultar el indicador de foco
 *    - Gestión de foco al abrir/cerrar modales y menús
 *    - Roving tabindex en grupos de botones (chip filters, radiogroups)
 *
 * 2. ETIQUETAS ARIA (WCAG 1.3.1 — Info and Relationships, 4.1.2 — Name, Role, Value)
 *    - Sincronización dinámica de aria-expanded en toggles
 *    - aria-live regions para feedback inmediato al usuario
 *    - Tooltips accesibles con role="tooltip"
 *
 * 3. ANUNCIOS PARA LECTORES DE PANTALLA
 *    - announceToScreenReader(message, priority) — inyecta mensajes en una
 *      región aria-live sin afectar el layout visual
 *
 * 4. UTILITARIOS GENERALES
 *    - focusTrap(element) — atrapa el foco dentro de un contenedor
 *    - restoreFocus(triggerElement) — devuelve el foco al elemento disparador
 *    - getFocusableElements(container) — lista los elementos enfocables
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     1. DETECCIÓN DE MODO DE ENTRADA (Teclado vs. Mouse)
        WCAG 2.4.7 — el indicador de foco debe ser visible cuando
        el usuario navega con el teclado.
     ═══════════════════════════════════════════════════════════════ */

  let isKeyboardUser = false;

  /**
   * Al presionar Tab, activamos el modo teclado.
   * Al hacer click, lo desactivamos.
   * Esto permite mostrar el anillo de foco solo cuando es necesario.
   * El CSS ya usa :focus-visible para esto, pero algunos navegadores
   * (Safari < 15.4) no lo soportan completamente, por eso añadimos
   * la clase .keyboard-mode al <body> como fallback.
   */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (!isKeyboardUser) {
        isKeyboardUser = true;
        document.body.classList.add('keyboard-mode');
      }
    }
  }, { passive: true });

  document.addEventListener('mousedown', () => {
    if (isKeyboardUser) {
      isKeyboardUser = false;
      document.body.classList.remove('keyboard-mode');
    }
  }, { passive: true });

  document.addEventListener('touchstart', () => {
    if (isKeyboardUser) {
      isKeyboardUser = false;
      document.body.classList.remove('keyboard-mode');
    }
  }, { passive: true });


  /* ═══════════════════════════════════════════════════════════════
     2. REGIÓN ARIA-LIVE GLOBAL — Anuncios para lectores de pantalla
        WCAG 4.1.3 — Status Messages
     ═══════════════════════════════════════════════════════════════ */

  // Creamos dos regiones live: una "educada" y otra "urgente"
  let politeRegion, assertiveRegion;

  function createLiveRegions() {
    politeRegion = document.createElement('div');
    politeRegion.id = 'ew-live-polite';
    politeRegion.setAttribute('aria-live', 'polite');
    politeRegion.setAttribute('aria-atomic', 'true');
    politeRegion.className = 'sr-only';
    document.body.appendChild(politeRegion);

    assertiveRegion = document.createElement('div');
    assertiveRegion.id = 'ew-live-assertive';
    assertiveRegion.setAttribute('aria-live', 'assertive');
    assertiveRegion.setAttribute('aria-atomic', 'true');
    assertiveRegion.className = 'sr-only';
    document.body.appendChild(assertiveRegion);
  }

  /**
   * Anuncia un mensaje a los lectores de pantalla sin afectar el layout.
   * @param {string} message - Mensaje a anunciar
   * @param {'polite'|'assertive'} priority - Urgencia del anuncio
   */
  function announceToScreenReader(message, priority = 'polite') {
    const region = priority === 'assertive' ? assertiveRegion : politeRegion;
    if (!region) return;

    // Necesitamos limpiar y reasignar para disparar el anuncio incluso
    // si el mensaje es el mismo que el anterior.
    region.textContent = '';
    // setTimeout garantiza que el DOM se limpie antes de escribir el nuevo mensaje
    setTimeout(() => {
      region.textContent = message;
    }, 50);
  }

  // Exponer globalmente para uso en otros módulos
  window.ewAnnounce = announceToScreenReader;


  /* ═══════════════════════════════════════════════════════════════
     3. FOCUS TRAP — Atrapar el foco dentro de un contenedor modal
        WCAG 2.1.2 — No Keyboard Trap (inversamente: en modales SÍ
        debemos atrapar el foco para que no "escape" al contenido
        detrás del overlay)
     ═══════════════════════════════════════════════════════════════ */

  const FOCUSABLE_SELECTORS = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    'details > summary',
  ].join(', ');

  /**
   * Obtiene todos los elementos enfocables dentro de un contenedor.
   * @param {HTMLElement} container
   * @returns {HTMLElement[]}
   */
  function getFocusableElements(container) {
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS))
      .filter(el => !el.closest('[aria-hidden="true"]') && !el.closest('[hidden]'));
  }

  /**
   * Activa el focus trap en un contenedor.
   * Devuelve una función de cleanup para desactivarlo.
   * @param {HTMLElement} container
   * @returns {Function} cleanup
   */
  function focusTrap(container) {
    function handleKeydown(e) {
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeydown);

    // Foco inicial en el primer elemento del contenedor
    const firstFocusable = getFocusableElements(container)[0];
    if (firstFocusable) {
      requestAnimationFrame(() => firstFocusable.focus());
    }

    return function cleanup() {
      document.removeEventListener('keydown', handleKeydown);
    };
  }

  // Exponer para uso desde otros módulos
  window.ewFocusTrap = focusTrap;
  window.ewGetFocusable = getFocusableElements;


  /* ═══════════════════════════════════════════════════════════════
     4. ARIA-EXPANDED — Sincronización automática en toggles
        WCAG 4.1.2 — Name, Role, Value
     ═══════════════════════════════════════════════════════════════ */

  /**
   * Auto-sincroniza aria-expanded en cualquier botón que controle
   * otro elemento (aria-controls). Se activa al hacer click.
   */
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[aria-controls][aria-expanded]');
    if (!toggle) return;

    const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isExpanded));

    const targetId = toggle.getAttribute('aria-controls');
    const target   = document.getElementById(targetId);
    if (target) {
      target.setAttribute('aria-hidden', String(isExpanded));
    }
  });


  /* ═══════════════════════════════════════════════════════════════
     5. ROVING TABINDEX — Navegación con flechas en grupos de botones
        WCAG 2.1.1 — Keyboard
        Aplica a: chips de categoría, grupos de radio buttons custom
     ═══════════════════════════════════════════════════════════════ */

  /**
   * Inicializa la navegación con flechas en un contenedor con role="group"
   * o role="radiogroup". El primer elemento tiene tabindex=0, el resto -1.
   * @param {HTMLElement} container - El contenedor del grupo
   * @param {string} itemSelector - Selector de los items del grupo
   */
  function initRovingTabindex(container, itemSelector) {
    const items = Array.from(container.querySelectorAll(itemSelector));
    if (items.length === 0) return;

    // Estado inicial: solo el primero es enfocable por Tab
    items.forEach((item, i) => {
      item.setAttribute('tabindex', i === 0 ? '0' : '-1');
    });

    container.addEventListener('keydown', (e) => {
      const current = document.activeElement;
      const idx     = items.indexOf(current);
      if (idx === -1) return;

      let next = -1;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        next = (idx + 1) % items.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        next = (idx - 1 + items.length) % items.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        next = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        next = items.length - 1;
      }

      if (next !== -1) {
        items[idx].setAttribute('tabindex', '-1');
        items[next].setAttribute('tabindex', '0');
        items[next].focus();
      }
    });
  }

  // Inicializar roving tabindex en chips de filtro al cargar la página
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[role="group"] .chip, [role="radiogroup"] .chip').forEach(chip => {
      const group = chip.closest('[role="group"], [role="radiogroup"]');
      if (group && !group.dataset.rovingInit) {
        initRovingTabindex(group, '.chip');
        group.dataset.rovingInit = 'true';
      }
    });
  });

  window.ewRovingTabindex = initRovingTabindex;


  /* ═══════════════════════════════════════════════════════════════
     6. TOOLTIPS ACCESIBLES — role="tooltip" + aria-describedby
        WCAG 1.4.13 — Content on Hover or Focus
     ═══════════════════════════════════════════════════════════════ */

  /**
   * Inicializa tooltips en elementos con data-tooltip="texto".
   * El tooltip se muestra al hacer hover Y al recibir foco (teclado).
   */
  function initTooltips() {
    const triggers = document.querySelectorAll('[data-tooltip]');

    triggers.forEach((trigger, i) => {
      const tooltipId   = `ew-tooltip-${i}`;
      const tooltipText = trigger.dataset.tooltip;

      // Crear el elemento tooltip
      const tooltip = document.createElement('span');
      tooltip.id        = tooltipId;
      tooltip.role      = 'tooltip';
      tooltip.textContent = tooltipText;
      tooltip.style.cssText = `
        position: absolute;
        z-index: 9999;
        padding: 6px 10px;
        background: #1E3350;
        color: #F1F5F9;
        font-size: 12px;
        border-radius: 6px;
        border: 1px solid rgba(148,163,184,0.2);
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 150ms ease;
        bottom: calc(100% + 6px);
        left: 50%;
        transform: translateX(-50%);
      `;

      // El trigger necesita position:relative para el posicionamiento del tooltip
      const triggerStyle = getComputedStyle(trigger);
      if (triggerStyle.position === 'static') {
        trigger.style.position = 'relative';
      }

      trigger.appendChild(tooltip);
      trigger.setAttribute('aria-describedby', tooltipId);

      const show = () => { tooltip.style.opacity = '1'; };
      const hide = () => { tooltip.style.opacity = '0'; };

      trigger.addEventListener('mouseenter', show);
      trigger.addEventListener('mouseleave', hide);
      trigger.addEventListener('focus', show);
      trigger.addEventListener('blur', hide);
    });
  }


  /* ═══════════════════════════════════════════════════════════════
     7. SCROLL SUAVE A ANCLAS CON RESPETO AL PREFERS-REDUCED-MOTION
        WCAG 2.3.3 — Animation from Interactions (AAA, pero buena práctica)
     ═══════════════════════════════════════════════════════════════ */

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const targetId = link.getAttribute('href').slice(1);
    const target   = document.getElementById(targetId);
    if (!target) return;

    // Respetar preferencia del usuario de movimiento reducido
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    e.preventDefault();
    target.scrollIntoView({
      behavior: prefersReduced ? 'auto' : 'smooth',
      block: 'start',
    });

    // Dar foco al elemento destino para usuarios de teclado
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
    }
    target.focus({ preventScroll: true });
  });


  /* ═══════════════════════════════════════════════════════════════
     8. INICIALIZACIÓN
     ═══════════════════════════════════════════════════════════════ */

  // Las live regions se deben crear lo antes posible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      createLiveRegions();
      initTooltips();
    });
  } else {
    createLiveRegions();
    initTooltips();
  }

})();
