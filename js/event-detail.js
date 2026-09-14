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
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  const buyBtn = document.getElementById('buy-btn');

  if (buyBtn) {
    buyBtn.addEventListener('click', () => {
      const cartItem = {
        eventId:    eventId,
        eventName:  'Coldplay — Music of the Spheres World Tour',
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

})();
