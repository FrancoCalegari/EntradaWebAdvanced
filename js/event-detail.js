
/**
 * ENTRADAWEB - Ficha de evento
 * Integración con la API de eventos y entradas.
 *
 * GET  /api/eventos/:id
 * GET  /api/eventos/:id/entradas
 *
 * El carrito se guarda temporalmente en sessionStorage.
 * La compra final se procesa desde el carrito.
 */
(function () {
  'use strict';

  const API = '/api';
  const CART_KEY = 'ew_cart';
  const FEE_RATE = 0.10;
  const MIN_QTY = 1;
  const MAX_QTY = 8;

  const params = new URLSearchParams(window.location.search);
  const eventId = params.get('id');

  const ticketButtons = () =>
    [...document.querySelectorAll('.ticket-type[role="radio"]')];

  const qtyDecreaseBtn = document.getElementById('qty-decrease');
  const qtyIncreaseBtn = document.getElementById('qty-increase');
  const qtyValueEl = document.getElementById('qty-value');

  const summaryTypeLabel = document.getElementById('summary-type-label');
  const summarySubtotal = document.getElementById('summary-subtotal');
  const summaryFee = document.getElementById('summary-fee');
  const summaryTotal = document.getElementById('summary-total');

  const buyBtn = document.getElementById('buy-btn');

  let eventData = null;
  let tickets = [];
  let selectedTicket = null;
  let quantity = 1;

  const originalButtonText = buyBtn
    ? buyBtn.textContent.trim()
    : 'Agregar al carrito';

  function formatCurrency(value) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  async function apiGet(path) {
    const response = await fetch(`${API}${path}`, {
      headers: { Accept: 'application/json' }
    });

    let result;

    try {
      result = await response.json();
    } catch {
      throw new Error('El servidor devolvió una respuesta inválida.');
    }

    if (!response.ok || result.success === false) {
      throw new Error(
        result.message || `Error del servidor: ${response.status}`
      );
    }

    return result.data;
  }

  function showMessage(message, type = 'info') {
    let notice = document.getElementById('event-api-notice');

    if (!notice) {
      notice = document.createElement('p');
      notice.id = 'event-api-notice';
      notice.setAttribute(
        'role',
        type === 'error' ? 'alert' : 'status'
      );

      notice.style.cssText =
        'margin:16px 0;padding:12px;border-radius:8px;' +
        'background:var(--color-surface,#f3f4f6);' +
        'color:var(--color-text,#222);';

      const target =
        document.querySelector('.purchase-panel') ||
        document.querySelector('main') ||
        document.body;

      target.prepend(notice);
    }

    notice.textContent = message;
    notice.dataset.type = type;
  }

  function setText(selector, value) {
    const element = document.querySelector(selector);

    if (
      element &&
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ''
    ) {
      element.textContent = String(value);
    }
  }

  function renderEvent(event) {
    const title = event.titulo || event.nombre || 'Evento';

    setText(
      '#event-title, .event-detail__title, .event-title',
      title
    );

    setText(
      '#event-location, .event-location, [data-event-location]',
      event.lugar
    );

    setText(
      '#event-description, .event-description, [data-event-description]',
      event.descripcion
    );

    if (event.fecha) {
      const date = new Date(event.fecha);

      if (!Number.isNaN(date.getTime())) {
        const formattedDate = new Intl.DateTimeFormat('es-AR', {
          dateStyle: 'full',
          timeStyle: 'short'
        }).format(date);

        setText(
          '#event-date, .event-date, [data-event-date]',
          formattedDate
        );
      }
    }

    document.title = `${title} | EntradaWeb`;
  }

  function updateSummary() {
    if (!selectedTicket) return;

    const price = Number(selectedTicket.precio);
    const subtotal = price * quantity;
    const fee = Math.round(subtotal * FEE_RATE);
    const total = subtotal + fee;

    if (summaryTypeLabel) {
      summaryTypeLabel.textContent =
        `${selectedTicket.tipo} × ${quantity}`;
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

  function updateQuantityUI() {
    if (qtyValueEl) {
      qtyValueEl.textContent = String(quantity);

      qtyValueEl.setAttribute('aria-valuenow', String(quantity));

      qtyValueEl.setAttribute(
        'aria-label',
        `${quantity} entrada${quantity !== 1 ? 's' : ''}`
      );
    }

    if (qtyDecreaseBtn) {
      qtyDecreaseBtn.disabled = quantity <= MIN_QTY;
    }

    if (qtyIncreaseBtn) {
      const stock = selectedTicket
        ? Number(selectedTicket.stock)
        : 0;

      qtyIncreaseBtn.disabled =
        quantity >= Math.min(MAX_QTY, stock);
    }

    updateSummary();
  }

  function selectTicket(ticket, button) {
    if (!ticket || Number(ticket.stock) <= 0) return;

    selectedTicket = ticket;

    ticketButtons().forEach((item) => {
      const selected = item === button;

      item.classList.toggle('ticket-type--selected', selected);
      item.setAttribute('aria-checked', String(selected));
    });

    quantity = Math.min(
      quantity,
      MAX_QTY,
      Number(ticket.stock)
    );

    quantity = Math.max(MIN_QTY, quantity);

    if (buyBtn) buyBtn.disabled = false;

    updateQuantityUI();
  }

  function renderTickets(data) {
    tickets = Array.isArray(data) ? data : [];

    const buttons = ticketButtons();

    if (tickets.length === 0) {
      buttons.forEach((button) => {
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
      });

      if (buyBtn) buyBtn.disabled = true;

      showMessage(
        'Este evento todavía no tiene entradas cargadas.'
      );

      return;
    }

    if (buttons.length === 0) {
      if (buyBtn) buyBtn.disabled = true;

      showMessage(
        'No se encontró el selector de entradas en la página.',
        'error'
      );

      return;
    }

    tickets.forEach((ticket, index) => {
      const button = buttons[index];

      // El HTML actual contiene tres opciones.
      // Si la API devuelve más tipos, no inventamos botones ni precios.
      if (!button) return;

      button.dataset.ticketId = String(ticket.id);
      button.dataset.price = String(ticket.precio);
      button.dataset.stock = String(ticket.stock);

      button.disabled = Number(ticket.stock) <= 0;
      button.setAttribute(
        'aria-disabled',
        String(button.disabled)
      );

      const name = button.querySelector('.ticket-type__name');

      if (name) {
        name.textContent = ticket.tipo;
      }

      const priceElement = button.querySelector(
        '.ticket-type__price, .ticket-type__amount, [data-ticket-price]'
      );

      if (priceElement) {
        priceElement.textContent = formatCurrency(ticket.precio);
      }

      const stockElement = button.querySelector(
        '.ticket-type__stock, [data-ticket-stock]'
      );

      if (stockElement) {
        stockElement.textContent =
          Number(ticket.stock) > 0
            ? `${ticket.stock} disponibles`
            : 'Agotadas';
      }

      // Reemplazamos el botón para evitar acumular eventos.
      const refreshedButton = button.cloneNode(true);
      button.replaceWith(refreshedButton);

      refreshedButton.addEventListener('click', () => {
        selectTicket(ticket, refreshedButton);
      });

      refreshedButton.addEventListener('keydown', (event) => {
        handleTicketKeyboard(event, refreshedButton);
      });
    });

    // Ocultar las opciones de ejemplo que no existan en la API.
    ticketButtons().forEach((button, index) => {
      button.hidden = index >= tickets.length;
    });

    const availableIndex = tickets.findIndex(
      (ticket) => Number(ticket.stock) > 0
    );

    if (availableIndex === -1) {
      if (buyBtn) buyBtn.disabled = true;

      showMessage('Las entradas de este evento están agotadas.');

      return;
    }

    selectTicket(
      tickets[availableIndex],
      ticketButtons()[availableIndex]
    );
  }

  function handleTicketKeyboard(event, button) {
    const buttons = ticketButtons().filter(
      (item) => !item.disabled && !item.hidden
    );

    const index = buttons.indexOf(button);

    if (index < 0 || buttons.length < 2) return;

    let nextIndex;

    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowRight'
    ) {
      nextIndex = (index + 1) % buttons.length;
    } else if (
      event.key === 'ArrowUp' ||
      event.key === 'ArrowLeft'
    ) {
      nextIndex = (index - 1 + buttons.length) % buttons.length;
    } else {
      return;
    }

    event.preventDefault();
    buttons[nextIndex].focus();
    buttons[nextIndex].click();
  }

  function getCart() {
    try {
      const cart = JSON.parse(
        sessionStorage.getItem(CART_KEY) || '[]'
      );

      return Array.isArray(cart) ? cart : [];
    } catch {
      return [];
    }
  }

  function addToCart() {
    if (!eventData || !selectedTicket) {
      showMessage(
        'No se puede agregar la entrada porque no se cargó el evento.',
        'error'
      );

      return;
    }

    const stock = Number(selectedTicket.stock);

    if (quantity < MIN_QTY || quantity > MAX_QTY || quantity > stock) {
      showMessage(
        'La cantidad supera el stock disponible.',
        'error'
      );

      return;
    }

    const item = {
      eventId: Number(eventData.id),
      eventName: eventData.titulo || eventData.nombre || 'Evento',
      entradaId: Number(selectedTicket.id),
      ticketType: selectedTicket.tipo,
      price: Number(selectedTicket.precio),
      quantity,
      total: Number(selectedTicket.precio) * quantity
    };

    try {
      const cart = getCart();

      const existingIndex = cart.findIndex((existing) =>
        Number(existing.entradaId ?? existing.entrada_id) === item.entradaId
      );

      if (existingIndex >= 0) {
        const previousQuantity = Number(
          cart[existingIndex].quantity ??
          cart[existingIndex].qty ??
          0
        );

        const newQuantity = previousQuantity + quantity;

        if (newQuantity > Math.min(MAX_QTY, stock)) {
          showMessage(
            'No podés agregar más unidades que las disponibles.',
            'error'
          );

          return;
        }

        cart[existingIndex] = {
          ...cart[existingIndex],
          ...item,
          quantity: newQuantity,
          total: item.price * newQuantity
        };
      } else {
        cart.push(item);
      }

      sessionStorage.setItem(CART_KEY, JSON.stringify(cart));

      showMessage(
        'Entrada agregada al carrito correctamente.',
        'success'
      );

      if (buyBtn) {
        buyBtn.textContent = '✓ Agregado al carrito';
        buyBtn.disabled = true;

        window.setTimeout(() => {
          buyBtn.textContent =
            originalButtonText || 'Agregar al carrito';

          buyBtn.disabled =
            !selectedTicket || Number(selectedTicket.stock) <= 0;
        }, 1800);
      }
    } catch (error) {
      console.error(
        '[EntradaWeb] No se pudo guardar el carrito:',
        error
      );

      showMessage(
        'No se pudo guardar el carrito de esta sesión.',
        'error'
      );
    }
  }

  async function loadEvent() {
    if (!eventId || !/^\d+$/.test(eventId)) {
      showMessage(
        'Falta un ID válido del evento en la dirección de la página.',
        'error'
      );

      if (buyBtn) buyBtn.disabled = true;

      return;
    }

    try {
      const eventResult = await apiGet(
        `/eventos/${encodeURIComponent(eventId)}`
      );

      eventData = eventResult?.evento || eventResult;

      if (!eventData || !eventData.id) {
        throw new Error('No se encontró el evento solicitado.');
      }

      renderEvent(eventData);

      const ticketsResult = await apiGet(
        `/eventos/${encodeURIComponent(eventId)}/entradas`
      );

      const ticketData = Array.isArray(ticketsResult)
        ? ticketsResult
        : (
            ticketsResult?.entradas ||
            ticketsResult?.data ||
            []
          );

      renderTickets(ticketData);
    } catch (error) {
      console.error(
        '[EntradaWeb] Error cargando evento:',
        error
      );

      showMessage(
        error.message || 'No se pudo cargar el evento.',
        'error'
      );

      if (buyBtn) buyBtn.disabled = true;
    }
  }

  if (qtyDecreaseBtn) {
    qtyDecreaseBtn.addEventListener('click', () => {
      if (quantity > MIN_QTY) {
        quantity -= 1;
        updateQuantityUI();
      }
    });
  }

  if (qtyIncreaseBtn) {
    qtyIncreaseBtn.addEventListener('click', () => {
      const stock = selectedTicket
        ? Number(selectedTicket.stock)
        : 0;

      if (quantity < Math.min(MAX_QTY, stock)) {
        quantity += 1;
        updateQuantityUI();
      }
    });
  }

  if (buyBtn) {
    buyBtn.disabled = true;
    buyBtn.addEventListener('click', addToCart);
  }

  // Control "Leer más / Leer menos".
  const descToggle = document.getElementById('desc-toggle');
  const descExtra = document.getElementById('desc-extra');
  const toggleLabel = document.getElementById('toggle-label');
  const toggleIcon = document.getElementById('toggle-icon');

  if (descToggle && descExtra) {
    descToggle.addEventListener('click', () => {
      const expanded =
        descToggle.getAttribute('aria-expanded') === 'true';

      descExtra.hidden = expanded;
      descToggle.setAttribute(
        'aria-expanded',
        String(!expanded)
      );

      if (toggleLabel) {
        toggleLabel.textContent = expanded
          ? 'Leer más'
          : 'Leer menos';
      }

      if (toggleIcon) {
        toggleIcon.textContent = expanded ? '↓' : '↑';
      }
    });
  }

  updateQuantityUI();
  loadEvent();
})();
