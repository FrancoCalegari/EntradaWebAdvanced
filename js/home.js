/**
 * ENTRADAWEB — Home Page
 * Rol: Santiago Morales (Frontend)
 *
 * Implementa:
 * - Header sticky con detección de scroll
 * - Menú hamburguesa accesible (ARIA)
 * - Sincronización de buscadores (hero ↔ header ↔ móvil)
 * - Carga dinámica de eventos destacados desde /api/eventos
 * - Skeleton loaders mientras esperan datos
 * - Animación de tarjetas al hacer scroll (IntersectionObserver)
 * - Chips de provincia scrollables con teclado
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────────────
     1. HEADER — SCROLL DETECTION
  ───────────────────────────────────────────────────────────────── */

  const siteHeader = document.getElementById('site-header');

  if (siteHeader) {
    const onScroll = () => {
      if (window.scrollY > 20) {
        siteHeader.classList.add('site-header--scrolled');
      } else {
        siteHeader.classList.remove('site-header--scrolled');
      }
    };

    // Throttle para no disparar en cada px
    let scrollTick = false;
    window.addEventListener('scroll', () => {
      if (!scrollTick) {
        window.requestAnimationFrame(() => {
          onScroll();
          scrollTick = false;
        });
        scrollTick = true;
      }
    }, { passive: true });

    onScroll(); // Estado inicial
  }

  /* ─────────────────────────────────────────────────────────────────
     2. MENÚ HAMBURGUESA ACCESIBLE
  ───────────────────────────────────────────────────────────────── */

  const menuToggle  = document.getElementById('menu-toggle');
  const menuClose   = document.getElementById('menu-close');
  const menuOverlay = document.getElementById('menu-overlay');
  const mobileMenu  = document.getElementById('mobile-menu');

  /**
   * Abre/cierra el menú móvil de forma accesible.
   * @param {boolean} open
   */
  function setMenuOpen(open) {
    if (!mobileMenu || !menuToggle) return;

    mobileMenu.classList.toggle('mobile-menu--open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    menuToggle.setAttribute('aria-expanded', String(open));

    // Bloquear scroll del body cuando el menú está abierto
    document.body.style.overflow = open ? 'hidden' : '';

    if (open) {
      // Foco al botón de cierre para accesibilidad con teclado
      menuClose?.focus();
    } else {
      // Devolver foco al toggle
      menuToggle.focus();
    }
  }

  menuToggle?.addEventListener('click', () => setMenuOpen(true));
  menuClose?.addEventListener('click',  () => setMenuOpen(false));
  menuOverlay?.addEventListener('click', () => setMenuOpen(false));

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu?.classList.contains('mobile-menu--open')) {
      setMenuOpen(false);
    }
  });

  // Cerrar el menú si se cambia a desktop
  const desktopMQ = window.matchMedia('(min-width: 1024px)');
  desktopMQ.addEventListener('change', (e) => {
    if (e.matches) setMenuOpen(false);
  });

  /* ─────────────────────────────────────────────────────────────────
     3. SINCRONIZACIÓN DE BUSCADORES
  ───────────────────────────────────────────────────────────────── */

  const heroInput    = document.getElementById('hero-search-input');
  const headerInput  = document.getElementById('header-search');
  const mobileInput  = document.getElementById('mobile-search-input');
  const heroForm     = document.getElementById('hero-search-form');

  /**
   * Propaga el valor de búsqueda a todos los inputs para coherencia.
   * @param {string} value
   * @param {HTMLElement} source - input origen (no actualizar para evitar loop)
   */
  function syncSearch(value, source) {
    [heroInput, headerInput, mobileInput].forEach(input => {
      if (input && input !== source) {
        input.value = value;
      }
    });
  }

  [heroInput, headerInput, mobileInput].forEach(input => {
    input?.addEventListener('input', (e) => {
      syncSearch(e.target.value, e.target);
    });
  });

  // Header y mobile redirigen al hacer Enter
  [headerInput, mobileInput].forEach(input => {
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        e.preventDefault();
        const q = encodeURIComponent(e.target.value.trim());
        window.location.href = `./pages/eventos.html?q=${q}`;
      }
    });
  });

  // Form del hero redirige correctamente
  heroForm?.addEventListener('submit', (e) => {
    const q = heroInput?.value.trim();
    if (!q) {
      e.preventDefault();
      heroInput?.focus();
    }
    // Si tiene valor, el form action+method=get funciona solo
  });

  /* ─────────────────────────────────────────────────────────────────
     4. CARGA DE EVENTOS DESTACADOS
  ───────────────────────────────────────────────────────────────── */

  const eventsGrid = document.getElementById('events-grid');

  /**
   * Formatea un precio en pesos argentinos.
   * @param {number} precio
   * @returns {string}
   */
  function formatPrice(precio) {
    if (!precio || precio === 0) return 'Gratis';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(precio);
  }

  /**
   * Formatea una fecha ISO a texto legible en español.
   * @param {string} fechaISO
   * @returns {string}
   */
  function formatDate(fechaISO) {
    if (!fechaISO) return '';
    try {
      return new Intl.DateTimeFormat('es-AR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      }).format(new Date(fechaISO));
    } catch {
      return fechaISO;
    }
  }

  /**
   * Genera el HTML de una tarjeta de evento real.
   * @param {Object} evento
   * @returns {string}
   */
  function renderEventCard(evento) {
    const id       = evento.id || evento._id || '';
    const titulo   = evento.nombre || evento.titulo || 'Evento sin nombre';
    const fecha    = formatDate(evento.fecha || evento.fecha_inicio);
    const lugar    = evento.lugar || evento.ubicacion || evento.provincia || '';
    const precio   = formatPrice(evento.precio_min || evento.precio || 0);
    const img      = evento.imagen || evento.imagen_url || '';
    const cat      = evento.categoria || '';

    const imgHtml = img
      ? `<img src="${img}" alt="${titulo}" class="event-card__img" loading="lazy" width="400" height="225">`
      : `<div class="event-card__img" style="background: var(--color-bg-elevated); display:flex; align-items:center; justify-content:center; aspect-ratio:16/9;">
           <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="color:var(--color-text-disabled)" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
         </div>`;

    const catHtml = cat
      ? `<span class="event-card__badge">${cat}</span>`
      : '';

    return `
      <article class="event-card" role="listitem">
        <a href="./pages/evento-detalle.html?id=${id}" class="event-card__link" aria-label="Ver detalles de ${titulo}">
          ${imgHtml}
        </a>
        <div class="event-card__body">
          ${catHtml}
          <h3 class="event-card__title">${titulo}</h3>
          <div class="event-card__meta">
            ${fecha ? `
            <span class="event-card__meta-item">
              <svg class="event-card__meta-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <time>${fecha}</time>
            </span>` : ''}
            ${lugar ? `
            <span class="event-card__meta-item">
              <svg class="event-card__meta-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${lugar}
            </span>` : ''}
          </div>
          <p class="event-card__price">${precio}</p>
        </div>
        <div class="event-card__actions">
          <a href="./pages/evento-detalle.html?id=${id}" class="event-card__btn">
            Comprar entradas
          </a>
        </div>
      </article>
    `;
  }

  /**
   * Renderiza el estado de error si la API falla.
   */
  function renderError() {
    if (!eventsGrid) return;
    eventsGrid.innerHTML = `
      <div style="grid-column: 1/-1; display:flex; flex-direction:column; align-items:center; text-align: center; padding: var(--space-12) 0; color: var(--color-text-secondary);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:var(--space-4); color:var(--color-error)" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p style="font-size:var(--text-base); margin-bottom:var(--space-2); color:var(--color-text-primary);">No pudimos cargar los eventos</p>
        <p style="font-size:var(--text-sm);">Intentá de nuevo en unos minutos.</p>
        <button onclick="loadFeaturedEvents()" class="btn btn--ghost btn--sm" style="margin-top:var(--space-4);">Reintentar</button>
      </div>
    `;
  }

  /**
   * Carga los eventos destacados desde la API.
   * Exportada al scope window para el botón de reintentar.
   */
  window.loadFeaturedEvents = async function loadFeaturedEvents() {
    if (!eventsGrid) return;

    // Restaurar skeletons mientras carga
    eventsGrid.innerHTML = Array(4).fill(0).map(() => `
      <div class="event-card event-card--skeleton" role="listitem" aria-label="Cargando evento">
        <div class="event-card__img skeleton skeleton--img"></div>
        <div class="event-card__body" style="gap:var(--space-3);">
          <span class="skeleton skeleton--title" style="width:75%;"></span>
          <span class="skeleton skeleton--text" style="width:55%;"></span>
          <span class="skeleton skeleton--text" style="width:40%;"></span>
          <span class="skeleton" style="height:36px; border-radius:var(--radius-lg); margin-top:var(--space-2);"></span>
        </div>
      </div>
    `).join('');

    try {
      // Intentar cargar desde la API local
      const res = await fetch('/api/eventos?limit=8&destacado=true', {
        signal: AbortSignal.timeout(8000) // 8s de timeout
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      // Soporta { eventos: [...] } o directamente [...]
      const eventos = Array.isArray(data) ? data : (data.eventos || data.data || []);

      if (!eventos.length) {
        renderError();
        return;
      }

      // Renderizar tarjetas reales
      eventsGrid.innerHTML = eventos.slice(0, 8).map(renderEventCard).join('');

      // Activar animación de entrada con IntersectionObserver
      observeEventCards();

    } catch (err) {
      console.warn('[EntradaWeb] No se pudieron cargar eventos:', err.message);
      renderError();
    }
  };

  /* ─────────────────────────────────────────────────────────────────
     5. ANIMACIÓN DE TARJETAS CON INTERSECTIONOBSERVER
  ───────────────────────────────────────────────────────────────── */

  /**
   * Observa las tarjetas de evento y les aplica la clase .is-visible
   * cuando entran al viewport, con stagger (delay escalonado).
   */
  function observeEventCards() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: mostrar todas inmediatamente
      document.querySelectorAll('.event-card:not(.event-card--skeleton)')
        .forEach(card => card.classList.add('is-visible'));
      return;
    }

    const cards = document.querySelectorAll('.event-card:not(.event-card--skeleton)');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // Stagger delay: 100ms entre cada tarjeta
          const idx = Array.from(cards).indexOf(entry.target);
          setTimeout(() => {
            entry.target.classList.add('is-visible');
          }, idx * 80);
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    cards.forEach(card => observer.observe(card));
  }

  /* ─────────────────────────────────────────────────────────────────
     6. SCROLL HORIZONTAL DE CHIPS CON TECLADO
  ───────────────────────────────────────────────────────────────── */

  const provinceChips = document.querySelector('.province-chips');

  if (provinceChips) {
    provinceChips.addEventListener('keydown', (e) => {
      const step = 200; // px a desplazar con flecha
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        provinceChips.scrollBy({ left: step, behavior: 'smooth' });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        provinceChips.scrollBy({ left: -step, behavior: 'smooth' });
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────────
     7. INICIALIZACIÓN Y SESIÓN DE USUARIO
  ───────────────────────────────────────────────────────────────── */

  function updateAuthHeader() {
    const token = sessionStorage.getItem('ew_token') || localStorage.getItem('ew_token') || sessionStorage.getItem('entradaweb_token');
    const rawUser = sessionStorage.getItem('ew_user') || localStorage.getItem('ew_user') || sessionStorage.getItem('entradaweb_user');
    let user = null;
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        user = parsed.user || parsed;
      } catch (_) {}
    }

    const headerActions = document.querySelector('.site-header__actions');
    if (!headerActions || !token || !user) return;

    const nombre = user.nombre || 'Mi cuenta';
    const isAdmin = user.rol === 'admin';
    const panelUrl = isAdmin ? './pages/admin-showcase.html' : './pages/mis-compras.html';
    const panelLabel = isAdmin ? 'Panel Admin' : 'Mis compras';

    headerActions.innerHTML = `
      <a href="${panelUrl}" class="btn btn--ghost btn--sm" style="display:inline-flex; align-items:center; gap:6px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>${nombre.split(' ')[0]} (${panelLabel})</span>
      </a>
      <button id="btn-home-logout" class="btn btn--ghost btn--sm" title="Cerrar sesión" style="padding:6px 10px; cursor:pointer;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    `;

    document.getElementById('btn-home-logout')?.addEventListener('click', () => {
      ['ew_token', 'entradaweb_token', 'token', 'ew_user', 'entradaweb_user', 'user'].forEach(k => {
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      });
      window.location.reload();
    });
  }

  // Cargar eventos al cargar la página
  loadFeaturedEvents();
  updateAuthHeader();

})();
