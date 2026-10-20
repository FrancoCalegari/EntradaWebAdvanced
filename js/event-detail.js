/**
 * ENTRADAWEB — Interacciones de la Ficha de Evento
 * Rol: Santiago Morales (Frontend)
 *
 * Implementa:
 * - Selector de tipo de entrada con aria-checked y radio group accesible
 * - Selector de cantidad con spinbutton ARIA y límites (1–8)
 * - Cálculo dinámico de resumen de precio (cargo por servicio 10%)
 * - Toggle de descripción "leer más / leer menos"
 * - Botón "Agregar al carrito" (preparado para integración backend)
 */

(function () {
  'use strict';

  /* ─── CARGA DINÁMICA DESDE EL BACKEND ──────────────────────── */

  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');

  // Nombre del evento: se actualiza dinámicamente si hay datos del backend
  let loadedEventName = null;

  /**
   * Formatea una fecha ISO a texto legible en español argentino.
   */
  function formatDateLong(fechaISO) {
    if (!fechaISO) return '';
    try {
      return new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(fechaISO));
    } catch {
      return fechaISO;
    }
  }

  /**
   * Formatea un precio en pesos argentinos.
   */
  function formatPriceARS(precio) {
    if (!precio || precio === 0) return 'Gratis';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(precio);
  }

  /**
   * Carga los datos del evento desde /api/eventos/:id y actualiza el DOM.
   * Si falla o no hay id, se mantienen los datos estáticos del HTML.
   */
  async function loadEventFromAPI() {
    if (!eventId) return;

    try {
      const res = await fetch(`/api/eventos/${eventId}`, {
        signal: AbortSignal.timeout(8000)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!data.success || !data.data) return;

      const evento = data.data;
      loadedEventName = evento.titulo;

      // Actualizar título del hero
      const heroTitle = document.querySelector('.event-hero__title');
      if (heroTitle) heroTitle.textContent = evento.titulo;

      // Actualizar fecha del hero
      const heroDate = document.querySelector('.event-hero__meta-item time');
      if (heroDate && evento.fecha) {
        heroDate.textContent = formatDateLong(evento.fecha);
        heroDate.setAttribute('datetime', evento.fecha);
      }

      // Actualizar lugar del hero
      const heroMeta = document.querySelectorAll('.event-hero__meta-item');
      if (heroMeta[1] && evento.lugar) {
        const lugarSpan = heroMeta[1].querySelector('span:not(.event-hero__meta-icon)');
        if (lugarSpan) lugarSpan.textContent = evento.lugar;
      }

      // Actualizar info cards (fecha y lugar)
      const infoCards = document.querySelectorAll('.event-info-card');
      if (infoCards[0] && evento.fecha) {
        const timeEl = infoCards[0].querySelector('time, .event-info-card__value--highlight');
        if (timeEl) {
          timeEl.textContent = formatDateLong(evento.fecha);
        }
      }
      if (infoCards[1] && evento.lugar) {
        const lugarVal = infoCards[1].querySelector('.event-info-card__value--highlight');
        if (lugarVal) lugarVal.textContent = evento.lugar;
      }

      // Actualizar descripción
      if (evento.descripcion) {
        const descEl = document.querySelector('#event-description > p');
        if (descEl) descEl.textContent = evento.descripcion;
      }

      // Actualizar breadcrumb
      const breadcrumbCurrent = document.querySelector('.breadcrumb__current');
      if (breadcrumbCurrent) breadcrumbCurrent.textContent = evento.titulo;

      // Actualizar <title>
      document.title = `${evento.titulo} | EntradaWeb Argentina`;

      console.info('[EntradaWeb] Evento cargado desde API:', evento.titulo);

    } catch (err) {
      console.warn('[EntradaWeb] No se pudo cargar evento desde API, usando datos estáticos:', err.message);
    }
  }

  /**
   * Carga las entradas del evento desde /api/eventos/:id/entradas y
   * genera los botones de tipo de entrada dinámicamente.
   * Si falla o no hay entradas, se mantienen los botones estáticos del HTML.
   */
  async function loadEntradasFromAPI() {
    if (!eventId) return;

    try {
      const res = await fetch(`/api/eventos/${eventId}/entradas`, {
        signal: AbortSignal.timeout(8000)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!data.success || !Array.isArray(data.data) || data.data.length === 0) return;

      const entradas = data.data;
      const ticketList = document.querySelector('.ticket-type-list');
      if (!ticketList) return;

      // Reemplazar botones estáticos con los del backend
      ticketList.innerHTML = '';

      entradas.forEach((entrada, index) => {
        const precio = parseFloat(entrada.precio);
        const precioFormateado = formatPriceARS(precio);
        const isFirst = index === 0;
        const stockInfo = entrada.stock > 0
          ? `${entrada.stock} disponibles`
          : 'Agotado';

        const btn = document.createElement('button');
        btn.className = 'ticket-type' + (isFirst ? ' ticket-type--selected' : '');
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', isFirst ? 'true' : 'false');
        btn.dataset.price = precio;
        btn.dataset.ticketId = `entrada-${entrada.id}`;
        btn.dataset.entradaId = entrada.id;
        btn.id = `ticket-${entrada.id}`;

        if (entrada.stock <= 0) {
          btn.disabled = true;
          btn.style.opacity = '0.5';
        }

        btn.innerHTML = `
          <span class="ticket-type__radio">
            <span class="ticket-type__radio-dot"></span>
          </span>
          <span class="ticket-type__info">
            <span class="ticket-type__name">${entrada.tipo}</span>
            <span class="ticket-type__desc">${stockInfo}</span>
          </span>
          <span class="ticket-type__price" aria-label="${precioFormateado}">${precioFormateado}</span>
        `;

        ticketList.appendChild(btn);

        // Seleccionar la primera como default
        if (isFirst) {
          selectedPrice = precio;
          selectedName = entrada.tipo;
        }
      });

      // Actualizar el precio destacado del panel
      const minPrecio = Math.min(...entradas.map(e => parseFloat(e.precio)));
      const priceEl = document.querySelector('.purchase-card__price');
      if (priceEl) {
        priceEl.innerHTML = `<sup>$</sup>${Math.round(minPrecio).toLocaleString('es-AR')}`;
      }

      // Re-vincular event listeners de los nuevos botones
      rebindTicketButtons();
      updateSummary();

      console.info('[EntradaWeb] Entradas cargadas desde API:', entradas.length, 'tipos');

    } catch (err) {
      console.warn('[EntradaWeb] No se pudieron cargar entradas desde API, usando datos estáticos:', err.message);
    }
  }

  /**
   * Re-vincula los listeners de selección en los botones de tipo de entrada.
   * Se usa después de regenerar los botones dinámicamente.
   */
  function rebindTicketButtons() {
    const buttons = document.querySelectorAll('.ticket-type[role="radio"]');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        buttons.forEach(b => {
          b.classList.remove('ticket-type--selected');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('ticket-type--selected');
        btn.setAttribute('aria-checked', 'true');
        selectedPrice = parseInt(btn.dataset.price, 10);
        selectedName = btn.querySelector('.ticket-type__name').textContent;
        updateSummary();
      });

      btn.addEventListener('keydown', (e) => {
        const items = [...buttons];
        const idx = items.indexOf(btn);
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          items[(idx + 1) % items.length].focus();
          items[(idx + 1) % items.length].click();
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          items[(idx - 1 + items.length) % items.length].focus();
          items[(idx - 1 + items.length) % items.length].click();
        }
      });
    });
  }

  /* ─── SELECTOR DE TIPO DE ENTRADA ──────────────────────────── */

  const ticketButtons = document.querySelectorAll('.ticket-type[role="radio"]');
  let selectedPrice   = 35000;
  let selectedName    = 'Campo General';

  ticketButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Desmarcar todos
      ticketButtons.forEach(b => {
        b.classList.remove('ticket-type--selected');
        b.setAttribute('aria-checked', 'false');
      });

      // Marcar el seleccionado
      btn.classList.add('ticket-type--selected');
      btn.setAttribute('aria-checked', 'true');

      selectedPrice = parseInt(btn.dataset.price, 10);
      selectedName  = btn.querySelector('.ticket-type__name').textContent;

      updateSummary();
    });

    // Navegación por teclado en el radiogroup (flechas)
    btn.addEventListener('keydown', (e) => {
      const items = [...ticketButtons];
      const idx   = items.indexOf(btn);
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        items[(idx + 1) % items.length].focus();
        items[(idx + 1) % items.length].click();
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        items[(idx - 1 + items.length) % items.length].focus();
        items[(idx - 1 + items.length) % items.length].click();
      }
    });
  });

  /* ─── SELECTOR DE CANTIDAD ──────────────────────────────────── */

  const qtyDecreaseBtn = document.getElementById('qty-decrease');
  const qtyIncreaseBtn = document.getElementById('qty-increase');
  const qtyValueEl     = document.getElementById('qty-value');
  const MIN_QTY        = 1;
  const MAX_QTY        = 8;
  let quantity         = 1;

  function updateQuantityUI() {
    qtyValueEl.textContent = quantity;
    qtyValueEl.setAttribute('aria-valuenow', quantity);
    qtyValueEl.setAttribute('aria-label', `${quantity} entrada${quantity !== 1 ? 's' : ''} seleccionada${quantity !== 1 ? 's' : ''}`);
    qtyDecreaseBtn.disabled = quantity <= MIN_QTY;
    qtyIncreaseBtn.disabled = quantity >= MAX_QTY;
    updateSummary();
  }

  if (qtyDecreaseBtn) {
    qtyDecreaseBtn.addEventListener('click', () => {
      if (quantity > MIN_QTY) {
        quantity--;
        updateQuantityUI();
      }
    });
  }

  if (qtyIncreaseBtn) {
    qtyIncreaseBtn.addEventListener('click', () => {
      if (quantity < MAX_QTY) {
        quantity++;
        updateQuantityUI();
      }
    });
  }

  /* ─── CÁLCULO DINÁMICO DEL RESUMEN ─────────────────────────── */

  const summaryTypeLabel = document.getElementById('summary-type-label');
  const summarySubtotal  = document.getElementById('summary-subtotal');
  const summaryFee       = document.getElementById('summary-fee');
  const summaryTotal     = document.getElementById('summary-total');

  const FEE_RATE = 0.10; // 10% de cargo por servicio

  function formatCurrency(value) {
    return `$${value.toLocaleString('es-AR')}`;
  }

  function updateSummary() {
    const subtotal = selectedPrice * quantity;
    const fee      = Math.round(subtotal * FEE_RATE);
    const total    = subtotal + fee;

    if (summaryTypeLabel) {
      summaryTypeLabel.textContent = `${selectedName} × ${quantity}`;
    }
    if (summarySubtotal) {
      summarySubtotal.textContent = formatCurrency(subtotal);
    }
    if (summaryFee) {
      summaryFee.textContent = formatCurrency(fee);
    }
    if (summaryTotal) {
      summaryTotal.textContent = formatCurrency(total);
    }
  }

  /* ─── BOTÓN "AGREGAR AL CARRITO" ────────────────────────────── */
  const buyBtn = document.getElementById('buy-btn');

  if (buyBtn) {
    buyBtn.addEventListener('click', () => {
      // Usar el nombre real del evento cargado desde la API, o el título del hero como fallback
      const eventName = loadedEventName
        || document.querySelector('.event-hero__title')?.textContent?.trim()
        || 'Evento';

      const cartItem = {
        eventId:    eventId,
        eventName:  eventName,
        ticketType: selectedName,
        price:      selectedPrice,
        quantity:   quantity,
        total:      selectedPrice * quantity + Math.round(selectedPrice * quantity * FEE_RATE),
      };

      // Guardar en sessionStorage para el carrito (Lucas lo conectará al backend)
      try {
        const cart = JSON.parse(sessionStorage.getItem('ew_cart') || '[]');
        const existing = cart.findIndex(i => i.eventId === cartItem.eventId && i.ticketType === cartItem.ticketType);

        if (existing >= 0) {
          // Si ya existe esa combinación, actualizar cantidad
          cart[existing].quantity = Math.min(cart[existing].quantity + cartItem.quantity, MAX_QTY);
          cart[existing].total    = cart[existing].price * cart[existing].quantity +
                                    Math.round(cart[existing].price * cart[existing].quantity * FEE_RATE);
        } else {
          cart.push(cartItem);
        }
        sessionStorage.setItem('ew_cart', JSON.stringify(cart));
      } catch (err) {
        console.warn('[EntradaWeb] No se pudo guardar en sessionStorage:', err);
      }

      // Feedback visual del botón
      buyBtn.textContent = '✓ Agregado al carrito';
      buyBtn.disabled    = true;
      buyBtn.style.background    = 'var(--color-success)';
      buyBtn.style.borderColor   = 'var(--color-success)';

      setTimeout(() => {
        buyBtn.textContent           = '🎟 Agregar al carrito';
        buyBtn.disabled              = false;
        buyBtn.style.background      = '';
        buyBtn.style.borderColor     = '';
      }, 2500);

      // TODO: Integrar con la API del carrito (Lucas Profe - Estación 4)
      console.info('[EntradaWeb] Carrito actualizado:', cartItem);
    });
  }

  /* ─── TOGGLE "LEER MÁS" DE DESCRIPCIÓN ─────────────────────── */

  const descToggle = document.getElementById('desc-toggle');
  const descExtra  = document.getElementById('desc-extra');
  const toggleLabel = document.getElementById('toggle-label');
  const toggleIcon  = document.getElementById('toggle-icon');

  if (descToggle && descExtra) {
    descToggle.addEventListener('click', () => {
      const isExpanded = descToggle.getAttribute('aria-expanded') === 'true';

      if (isExpanded) {
        descExtra.hidden = true;
        descToggle.setAttribute('aria-expanded', 'false');
        toggleLabel.textContent = 'Leer más';
        toggleIcon.textContent  = '↓';
      } else {
        descExtra.hidden = false;
        descToggle.setAttribute('aria-expanded', 'true');
        toggleLabel.textContent = 'Leer menos';
        toggleIcon.textContent  = '↑';
      }
    });
  }

  /* ─── INICIALIZACIÓN ────────────────────────────────────────── */
  updateSummary();

  // Cargar datos reales del backend (si hay ?id= en la URL)
  // Si la API no responde, se mantienen los datos estáticos del HTML
  loadEventFromAPI();
  loadEntradasFromAPI();

})();
