/**
 * ENTRADAWEB — Filtros de eventos (categoría + ordenamiento)
 * Rol: Santiago Morales (Frontend)
 *
 * Implementa:
 * - Carga dinámica desde /api/eventos con fallback a contenido estático
 * - Lectura del parámetro ?categoria= en la URL para filtro inicial automático
 * - Chips de categoría con aria-pressed
 * - Filtrado visual de tarjetas por data-category
 * - Ordenamiento por fecha / precio
 * - Contador de resultados con aria-live para lectores de pantalla
 * - Validación de rango de fechas en el buscador
 */

(function () {
  'use strict';

  // ─── Referencias ──────────────────────────────────────────────
  const categoryChips = document.querySelectorAll('[data-category]');
  const eventsGrid    = document.getElementById('events-grid');
  const eventsCount   = document.getElementById('events-count');
  const sortSelect    = document.getElementById('sort-select');
  const searchBtn     = document.getElementById('search-btn');
  const searchFrom    = document.getElementById('search-from');
  const searchTo      = document.getElementById('search-to');

  // ─── Estado actual ────────────────────────────────────────────
  const urlCategory = new URLSearchParams(window.location.search).get('categoria');
  let activeCategory = urlCategory ? urlCategory.toLowerCase().trim() : 'all';

  function formatPrice(value) {
    return '$' + Math.round(Number(value) || 0).toLocaleString('es-AR');
  }

  function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  function renderEventCard(ev) {
    const id = ev.id || '';
    const titulo = ev.titulo || ev.nombre || 'Evento sin título';
    const categoria = (ev.categoria || 'musica').toLowerCase();
    const lugar = ev.lugar || ev.ubicacion || '';
    const fecha = formatDate(ev.fecha || ev.fecha_inicio);
    const precio = formatPrice(ev.precio_min !== undefined ? ev.precio_min : ev.precio);
    const estado = ev.estado || 'disponible';
    const imagen = ev.imagen || `https://placehold.co/400x225/132338/EA580C?text=${encodeURIComponent(titulo)}`;

    return `
      <article class="event-card" data-category="${categoria}" tabindex="0" aria-label="${titulo}">
        <div class="event-card__img-wrapper">
          <img
            src="${imagen}"
            alt="${titulo}"
            class="event-card__img"
            loading="lazy"
            width="400"
            height="225"
          >
          <span class="event-card__category">
            <span class="badge badge--primary">${categoria.toUpperCase()}</span>
          </span>
          <span class="event-card__status">
            <span class="badge badge--success">${estado.charAt(0).toUpperCase() + estado.slice(1)}</span>
          </span>
        </div>
        <div class="event-card__body">
          <h2 class="event-card__title">${titulo}</h2>
          <div class="event-card__meta">
            ${fecha ? `
            <div class="event-card__meta-item">
              <span class="event-card__meta-icon" aria-hidden="true">📅</span>
              <time class="event-card__date">${fecha}</time>
            </div>` : ''}
            ${lugar ? `
            <div class="event-card__meta-item">
              <span class="event-card__meta-icon" aria-hidden="true">📍</span>
              <span>${lugar}</span>
            </div>` : ''}
          </div>
        </div>
        <div class="event-card__footer">
          <div class="event-card__price-block">
            <span class="event-card__price-label">Desde</span>
            <span class="event-card__price">${precio}</span>
          </div>
          <a href="./evento-detalle.html?id=${id}" class="btn btn--primary btn--sm">Comprar</a>
        </div>
      </article>
    `;
  }

  // ─── Carga de eventos desde API ───────────────────────────────
  async function cargarEventos() {
    try {
      const response = await fetch('/api/eventos');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const resultado = await response.json();
      const eventos = Array.isArray(resultado) ? resultado : (resultado.data || resultado.eventos || []);

      if (eventos.length > 0 && eventsGrid) {
        eventsGrid.innerHTML = eventos.map(renderEventCard).join('');
        // Aplicar transiciones CSS
        document.querySelectorAll('.event-card').forEach(card => {
          card.style.transition = 'opacity 200ms ease, transform 200ms ease';
        });
      }

      filterEvents();
    } catch (error) {
      console.warn('[EntradaWeb] Utilizando eventos predeterminados:', error.message);
      filterEvents();
    }
  }

  // ─── Inicializar chips según categoría activa ────────────────
  if (categoryChips.length > 0) {
    categoryChips.forEach(chip => {
      const chipCat = chip.dataset.category;
      if (chipCat === activeCategory) {
        chip.classList.add('chip--selected');
        chip.setAttribute('aria-pressed', 'true');
      } else if (activeCategory !== 'all' && chipCat === 'all') {
        chip.classList.remove('chip--selected');
        chip.setAttribute('aria-pressed', 'false');
      }

      chip.addEventListener('click', () => {
        categoryChips.forEach(c => {
          c.classList.remove('chip--selected');
          c.setAttribute('aria-pressed', 'false');
        });

        chip.classList.add('chip--selected');
        chip.setAttribute('aria-pressed', 'true');
        activeCategory = chip.dataset.category;

        filterEvents();
      });

      chip.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          chip.click();
        }
      });
    });
  }

  // ─── Filtrado de tarjetas ─────────────────────────────────────
  function filterEvents() {
    if (!eventsGrid) return;

    const cards = eventsGrid.querySelectorAll('.event-card:not([aria-hidden="true"])');
    let visibleCount = 0;

    cards.forEach(card => {
      const cardCategory = (card.dataset.category || 'all').toLowerCase();
      const show = activeCategory === 'all' || cardCategory === activeCategory;

      if (show) {
        card.style.display = '';
        requestAnimationFrame(() => {
          card.style.opacity = '1';
          card.style.transform = '';
        });
        visibleCount++;
      } else {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.97)';
        setTimeout(() => {
          card.style.display = 'none';
        }, 200);
      }
    });

    if (eventsCount) {
      eventsCount.innerHTML = `<strong>${visibleCount}</strong> evento${visibleCount !== 1 ? 's' : ''}`;
    }
  }

  document.querySelectorAll('.event-card').forEach(card => {
    card.style.transition = 'opacity 200ms ease, transform 200ms ease';
  });

  // ─── Ordenamiento ─────────────────────────────────────────────
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      const value = sortSelect.value;
      if (!eventsGrid) return;
      const cards = Array.from(eventsGrid.querySelectorAll('.event-card'));

      if (value === 'price-asc') {
        cards.sort((a, b) => {
          const pA = Number((a.querySelector('.event-card__price')?.textContent || '').replace(/[^\d]/g, '')) || 0;
          const pB = Number((b.querySelector('.event-card__price')?.textContent || '').replace(/[^\d]/g, '')) || 0;
          return pA - pB;
        });
        cards.forEach(c => eventsGrid.appendChild(c));
      } else if (value === 'price-desc') {
        cards.sort((a, b) => {
          const pA = Number((a.querySelector('.event-card__price')?.textContent || '').replace(/[^\d]/g, '')) || 0;
          const pB = Number((b.querySelector('.event-card__price')?.textContent || '').replace(/[^\d]/g, '')) || 0;
          return pB - pA;
        });
        cards.forEach(c => eventsGrid.appendChild(c));
      }
    });
  }

  // ─── Validación de rango de fechas ───────────────────────────
  if (searchFrom && searchTo) {
    searchTo.addEventListener('change', () => {
      if (searchFrom.value && searchTo.value) {
        if (searchTo.value < searchFrom.value) {
          searchTo.classList.add('form-input--error');
          searchTo.setAttribute('aria-invalid', 'true');
          searchTo.setAttribute('aria-describedby', 'date-range-error');

          let errorMsg = document.getElementById('date-range-error');
          if (!errorMsg) {
            errorMsg = document.createElement('span');
            errorMsg.id = 'date-range-error';
            errorMsg.className = 'form-error';
            errorMsg.setAttribute('role', 'alert');
            searchTo.closest('.date-search__field')?.appendChild(errorMsg);
          }
          errorMsg.textContent = 'La fecha de fin debe ser posterior a la de inicio.';
        } else {
          searchTo.classList.remove('form-input--error');
          searchTo.removeAttribute('aria-invalid');
          searchTo.removeAttribute('aria-describedby');
          const errorMsg = document.getElementById('date-range-error');
          if (errorMsg) errorMsg.remove();
        }
      }
    });
  }

  // ─── Botón de búsqueda de texto ──────────────────────────────
  if (searchBtn) {
    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const query = (document.getElementById('search-event')?.value || '').toLowerCase().trim();
      if (!eventsGrid) return;

      const cards = eventsGrid.querySelectorAll('.event-card');
      let count = 0;
      cards.forEach(card => {
        const title = (card.querySelector('.event-card__title')?.textContent || '').toLowerCase();
        const matchesQuery = !query || title.includes(query);
        const cardCategory = (card.dataset.category || 'all').toLowerCase();
        const matchesCategory = activeCategory === 'all' || cardCategory === activeCategory;

        if (matchesQuery && matchesCategory) {
          card.style.display = '';
          card.style.opacity = '1';
          count++;
        } else {
          card.style.display = 'none';
        }
      });

      if (eventsCount) {
        eventsCount.innerHTML = `<strong>${count}</strong> evento${count !== 1 ? 's' : ''}`;
      }
    });
  }

  cargarEventos();

})();
