/**
 * ENTRADAWEB — Menu móvil accesible
 * Rol: Santiago Morales (Frontend)
 *
 * Implementa:
 * - Apertura/cierre del drawer con botón hamburguesa
 * - aria-expanded sincronizado en el toggle button
 * - Focus trap dentro del drawer (accesibilidad WCAG 2.1 - 2.1.2)
 * - Cierre con tecla Escape
 * - Cierre al hacer click en el overlay
 * - Prevención de scroll del body mientras el menú está abierto
 */

(function () {
  'use strict';

  const toggleBtn  = document.getElementById('menu-toggle-btn');
  const closeBtn   = document.getElementById('menu-close-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const overlay    = document.getElementById('menu-overlay');
  const header     = document.getElementById('site-header');

  if (!toggleBtn || !mobileMenu) return;

  // ─── Elementos enfocables dentro del drawer ───────────────────
  function getFocusableElements() {
    return Array.from(
      mobileMenu.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.closest('[aria-hidden="true"]'));
  }

  // ─── Abrir menú ───────────────────────────────────────────────
  function openMenu() {
    mobileMenu.classList.add('mobile-menu--open');
    toggleBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden'; // Bloquear scroll

    // Dar foco al botón de cierre al abrir
    requestAnimationFrame(() => {
      if (closeBtn) closeBtn.focus();
    });
  }

  // ─── Cerrar menú ──────────────────────────────────────────────
  function closeMenu() {
    mobileMenu.classList.remove('mobile-menu--open');
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    toggleBtn.focus(); // Devolver foco al botón que lo abrió
  }

  // ─── Focus trap (WCAG 2.1.2) ──────────────────────────────────
  function handleFocusTrap(e) {
    if (!mobileMenu.classList.contains('mobile-menu--open')) return;

    const focusable = getFocusableElements();
    const firstEl   = focusable[0];
    const lastEl    = focusable[focusable.length - 1];

    if (e.key === 'Tab') {
      if (e.shiftKey) {
        // Shift+Tab: si estamos en el primero, ir al último
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        // Tab: si estamos en el último, volver al primero
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }

    if (e.key === 'Escape') {
      closeMenu();
    }
  }

  // ─── Header: sombra al hacer scroll ───────────────────────────
  function handleHeaderScroll() {
    if (window.scrollY > 8) {
      header.classList.add('site-header--scrolled');
    } else {
      header.classList.remove('site-header--scrolled');
    }
  }

  // ─── Listeners ────────────────────────────────────────────────
  toggleBtn.addEventListener('click', openMenu);

  if (closeBtn) {
    closeBtn.addEventListener('click', closeMenu);
  }

  if (overlay) {
    overlay.addEventListener('click', closeMenu);
  }

  document.addEventListener('keydown', handleFocusTrap);

  if (header) {
    window.addEventListener('scroll', handleHeaderScroll, { passive: true });
  }

})();
