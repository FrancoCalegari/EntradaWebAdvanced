/**
 * ENTRADAWEB — Filtros de eventos (categoría + ordenamiento)
 * Rol: Santiago Morales (Frontend)
 *
 * Implementa:
 * - Chips de categoría con aria-pressed
 * - Filtrado visual de tarjetas por data-category
 * - Ordenamiento (preparado para datos reales del backend)
 * - Contador de resultados con aria-live para lectores de pantalla
 * - Validación de rango de fechas en el buscador (fecha "hasta" >= "desde")
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
  let activeCategory = 'all';

    // ─── Eventos desde el backend ────────────────────────────────
  async function cargarEventos() {
    try {
      const response = await fetch('/api/eventos');

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const resultado = await response.json();

      if (!resultado.success) {
        throw new Error(resultado.message || 'No se pudieron cargar los eventos');
      }

      console.log('[EntradaWeb] Eventos recibidos:', resultado.data);

    } catch (error) {
      console.error('[EntradaWeb] Error al cargar eventos:', error);
    }
  }

  // ─── Chips de categoría ───────────────────────────────────────
  if (categoryChips.length > 0) {
    categoryChips.forEach(chip => {
      chip.addEventListener('click', () => {
        // Desactivar todos
        categoryChips.forEach(c => {
          c.classList.remove('chip--selected');
          c.setAttribute('aria-pressed', 'false');
        });

        // Activar el seleccionado
        chip.classList.add('chip--selected');
        chip.setAttribute('aria-pressed', 'true');
        activeCategory = chip.dataset.category;

        filterEvents();
      });

      // Permitir activación con teclado (Space/Enter) además del click
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

    // Obtener tarjetas reales (no skeletons ni aria-hidden)
    const cards = eventsGrid.querySelectorAll('.event-card:not([aria-hidden="true"])');
    let visibleCount = 0;

    cards.forEach(card => {
      const cardCategory = card.dataset.category || 'all';
      const show = activeCategory === 'all' || cardCategory === activeCategory;

      // Animación suave de aparición/desaparición
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

    // Actualizar contador con aria-live (lectores de pantalla lo anunciarán)
    if (eventsCount) {
      eventsCount.innerHTML = `<strong>${visibleCount}</strong> evento${visibleCount !== 1 ? 's' : ''}`;
    }
  }

  // ─── Transición CSS en las tarjetas para el filtrado ─────────
  // Aplicamos la transición vía JS para que no afecte a la carga inicial
  document.querySelectorAll('.event-card').forEach(card => {
    card.style.transition = 'opacity 200ms ease, transform 200ms ease';
  });

  // ─── Ordenamiento ─────────────────────────────────────────────
  // Nota: La lógica real de ordenamiento será provista por el backend (Lucas Profe / integración).
  // Aquí preparamos el listener para cuando el backend envíe los datos.
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      const value = sortSelect.value;
      console.info(`[EntradaWeb] Ordenamiento seleccionado: "${value}". Se procesará con datos reales del backend.`);
      // TODO: conectar con la API una vez que Carla termine el endpoint /api/v1/query
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

          // Crear o actualizar mensaje de error
          let errorMsg = document.getElementById('date-range-error');
          if (!errorMsg) {
            errorMsg = document.createElement('span');
            errorMsg.id = 'date-range-error';
            errorMsg.className = 'form-error';
            errorMsg.setAttribute('role', 'alert');
            searchTo.closest('.date-search__field').appendChild(errorMsg);
          }
          errorMsg.textContent = 'La fecha de fin debe ser posterior a la de inicio.';
        } else {
          // Limpiar error
          searchTo.classList.remove('form-input--error');
          searchTo.removeAttribute('aria-invalid');
          searchTo.removeAttribute('aria-describedby');
          const errorMsg = document.getElementById('date-range-error');
          if (errorMsg) errorMsg.remove();
        }
      }
    });
  }

  // ─── Botón de búsqueda ────────────────────────────────────────
  if (searchBtn) {
    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const query   = document.getElementById('search-event')?.value?.trim();
      const fromVal = searchFrom?.value;
      const toVal   = searchTo?.value;

      // Validación básica de rango
      if (fromVal && toVal && toVal < fromVal) {
        if (searchTo) {
          searchTo.focus();
          searchTo.classList.add('form-input--error');
        }
        return;
      }

      // TODO: enviar parámetros al endpoint de búsqueda del backend
      console.info('[EntradaWeb] Búsqueda iniciada:', { query, from: fromVal, to: toVal });
    });
  }

  cargarEventos();

})();
