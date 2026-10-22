
/**
 * ENTRADAWEB - Carrito de compras
 * Integración con POST /api/compras.
 * Mantiene los controles, el resumen y los cupones.
 */

(function () {
  'use strict';

  const CART_KEY = 'ew_cart';
  const API_URL = '/api';
  const FEE_RATE = 0.10;

  const VALID_COUPONS = {
    ENTRADAS10: 0.10,
    EWFEST20: 0.20,
    PRIMERAVEZ: 0.15
  };

  const cartItemsList = document.getElementById('cart-items-list');
  const cartEmpty = document.getElementById('cart-empty');
  const cartLayout = document.querySelector('.cart-layout');
  const checkoutStepsNav = document.querySelector(
    'nav[aria-label="Pasos del proceso de compra"]'
  );

  const couponForm = document.getElementById('coupon-form');
  const couponInput = document.getElementById('coupon-input');
  const couponFeedback = document.getElementById('coupon-feedback');

  const sDiscountRow = document.getElementById('s-discount-row');
  const sDiscount = document.getElementById('s-discount');
  const sSubtotal = document.getElementById('s-subtotal');
  const sFee = document.getElementById('s-fee');
  const sTotal = document.getElementById('s-total');
  const navCartCount = document.getElementById('nav-cart-count');
  const checkoutBtn = document.getElementById('checkout-btn');

  let discountRate = 0;
  let isCheckingOut = false;

  function formatPrice(value) {
    return '$' + Math.round(value).toLocaleString('es-AR');
  }

  function getItems() {
    return cartItemsList
      ? Array.from(cartItemsList.querySelectorAll('.cart-item'))
      : [];
  }

  function getQuantity(item) {
    const qty = item.querySelector('[data-qty]');
    return Math.max(1, parseInt(qty?.dataset.qty || '1', 10));
  }

  function getEntryId(item) {
    return Number(item.dataset.entradaId || item.dataset.itemId);
  }

  function readCart() {
    try {
      const cart = JSON.parse(sessionStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(cart) ? cart : [];
    } catch (error) {
      console.error('No se pudo leer el carrito:', error);
      return [];
    }
  }

  function getAuthToken() {
    const keys = [
      'ew_token',
      'token',
      'authToken',
      'jwt',
      'access_token'
    ];

    for (const key of keys) {
      const token =
        sessionStorage.getItem(key) || localStorage.getItem(key);

      if (token && token.trim()) {
        return token.trim();
      }
    }

    for (const storage of [sessionStorage, localStorage]) {
      for (const key of ['ew_user', 'user', 'auth']) {
        try {
          const saved = JSON.parse(storage.getItem(key) || 'null');
          const token = saved?.token || saved?.data?.token;

          if (token) return token;
        } catch (_) {
          // El valor guardado no es JSON válido.
        }
      }
    }

    return null;
  }

  function saveCart() {
    const cart = getItems().map(item => ({
      entradaId: getEntryId(item),
      eventId: item.dataset.eventId
        ? Number(item.dataset.eventId)
        : undefined,
      eventName:
        item.querySelector('.cart-item__title')?.textContent.trim() ||
        'Evento',
      ticketType:
        item.querySelector('.cart-item__ticket-type')?.textContent.trim() ||
        'Entrada',
      price: Number(item.dataset.price) || 0,
      quantity: getQuantity(item)
    }));

    // No guardar IDs ficticios del HTML de ejemplo.
    if (cart.every(item =>
      Number.isInteger(item.entradaId) && item.entradaId > 0
    )) {
      sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
    }
  }

  function hydrateCart() {
    if (!cartItemsList) return;

    const storedCart = readCart().filter(item => {
      const id = Number(item.entradaId ?? item.entrada_id);
      return Number.isInteger(id) && id > 0;
    });

    if (!storedCart.length) return;

    const template = cartItemsList.querySelector('.cart-item');
    if (!template) return;

    cartItemsList.replaceChildren();

    storedCart.forEach(data => {
      const item = template.cloneNode(true);
      const entryId = Number(data.entradaId ?? data.entrada_id);
      const price = Number(data.price) || 0;
      const quantity = Math.max(
        1,
        Math.min(8, Number(data.quantity ?? data.qty) || 1)
      );

      item.dataset.itemId = String(entryId);
      item.dataset.entradaId = String(entryId);
      item.dataset.price = String(price);
      item.dataset.maxQty = '8';

      if (data.eventId != null) {
        item.dataset.eventId = String(data.eventId);
      }

      const title = item.querySelector('.cart-item__title');
      if (title) title.textContent = data.eventName || 'Evento';

      const ticket = item.querySelector('.cart-item__ticket-type');
      if (ticket) ticket.textContent = data.ticketType || 'Entrada';

      const qty = item.querySelector('[data-qty]');
      if (qty) {
        qty.dataset.qty = String(quantity);
        qty.textContent = String(quantity);
        qty.setAttribute('aria-valuenow', String(quantity));
        qty.setAttribute('aria-valuemax', '8');
      }

      const unitPrice = item.querySelector('.cart-item__unit-price');
      if (unitPrice) {
        unitPrice.textContent = `${formatPrice(price)} c/u`;
      }

      const total = item.querySelector('[data-item-total]');
      if (total) total.textContent = formatPrice(price * quantity);

      const remove = item.querySelector('.cart-item__remove');
      if (remove) {
        remove.dataset.itemId = String(entryId);
        remove.setAttribute(
          'aria-label',
          `Eliminar ${data.eventName || 'evento'} del carrito`
        );
      }

      const date = item.querySelector('.cart-item__meta-row time');
      if (date) date.textContent = 'Entrada seleccionada';

      cartItemsList.appendChild(item);
    });
  }

  function updateSummary() {
    const items = getItems();

    const subtotal = items.reduce((sum, item) => {
      return sum + (Number(item.dataset.price) || 0) * getQuantity(item);
    }, 0);

    const discount = Math.round(subtotal * discountRate);
    const base = subtotal - discount;
    const fee = Math.round(base * FEE_RATE);
    const total = base + fee;

    if (sSubtotal) sSubtotal.textContent = formatPrice(subtotal);
    if (sFee) sFee.textContent = formatPrice(fee);

    if (sTotal) {
      sTotal.textContent = formatPrice(total);
      sTotal.setAttribute('aria-label', `Total ${formatPrice(total)}`);
    }

    if (sDiscountRow && sDiscount) {
      sDiscountRow.style.display = discount > 0 ? '' : 'none';
      sDiscount.textContent = `-${formatPrice(discount)}`;
    }

    const quantity = items.reduce(
      (sum, item) => sum + getQuantity(item),
      0
    );

    if (navCartCount) {
      navCartCount.textContent = String(quantity);
      navCartCount.setAttribute(
        'aria-label',
        `${quantity} entrada${quantity !== 1 ? 's' : ''} en el carrito`
      );
    }

    checkEmptyCart();
    saveCart();
  }

  function checkEmptyCart() {
    const hasItems = getItems().length > 0;

    if (cartLayout) {
      cartLayout.style.display = hasItems ? '' : 'none';
    }

    if (checkoutStepsNav) {
      checkoutStepsNav.style.display = hasItems ? '' : 'none';
    }

    if (cartEmpty) {
      cartEmpty.hidden = hasItems;
      cartEmpty.style.display = hasItems ? 'none' : '';
    }
  }

  function initializeItem(item) {
    const decrease = item.querySelector('[data-action="decrease"]');
    const increase = item.querySelector('[data-action="increase"]');
    const qty = item.querySelector('[data-qty]');
    const total = item.querySelector('[data-item-total]');
    const remove = item.querySelector('.cart-item__remove');

    function updateQuantity() {
      const value = getQuantity(item);
      const max = Number(item.dataset.maxQty) || 8;

      if (qty) {
        qty.dataset.qty = String(value);
        qty.textContent = String(value);
        qty.setAttribute('aria-valuenow', String(value));
      }

      if (decrease) decrease.disabled = value <= 1;
      if (increase) increase.disabled = value >= max;

      if (total) {
        total.textContent = formatPrice(
          (Number(item.dataset.price) || 0) * value
        );
      }

      updateSummary();
    }

    decrease?.addEventListener('click', () => {
      const value = getQuantity(item);

      if (value > 1 && qty) {
        qty.dataset.qty = String(value - 1);
        updateQuantity();
      }
    });

    increase?.addEventListener('click', () => {
      const value = getQuantity(item);
      const max = Number(item.dataset.maxQty) || 8;

      if (value < max && qty) {
        qty.dataset.qty = String(value + 1);
        updateQuantity();
      }
    });

    remove?.addEventListener('click', () => {
      item.remove();
      updateSummary();
    });

    updateQuantity();
  }

  function showCouponMessage(message, isError) {
    if (!couponFeedback) return;

    couponFeedback.textContent = message;
    couponFeedback.setAttribute(
      'role',
      isError ? 'alert' : 'status'
    );
  }

  function initializeCoupons() {
    if (!couponForm || !couponInput) return;

    couponForm.addEventListener('submit', event => {
      event.preventDefault();

      const code = couponInput.value.trim().toUpperCase();

      if (!code) {
        discountRate = 0;
        showCouponMessage('Ingresá un código de descuento.', true);
        updateSummary();
        return;
      }

      if (!Object.prototype.hasOwnProperty.call(VALID_COUPONS, code)) {
        discountRate = 0;
        showCouponMessage('El cupón no es válido.', true);
        updateSummary();
        return;
      }

      discountRate = VALID_COUPONS[code];
      showCouponMessage('Cupón aplicado al resumen.', false);
      updateSummary();
    });
  }

  function validateCartForPurchase() {
    const items = getItems();

    if (!items.length) {
      alert('Tu carrito está vacío.');
      return null;
    }

    const payloadItems = [];

    for (const item of items) {
      const entradaId = getEntryId(item);
      const cantidad = getQuantity(item);

      if (!Number.isInteger(entradaId) || entradaId <= 0) {
        alert(
          'Hay una entrada de ejemplo o sin identificar en el carrito. ' +
          'Volvé al evento y seleccioná una entrada real.'
        );
        return null;
      }

      payloadItems.push({ entrada_id: entradaId, cantidad });
    }

    return payloadItems;
  }

  async function checkout() {
    if (isCheckingOut) return;

    const items = validateCartForPurchase();
    if (!items) return;

    const token = getAuthToken();

    if (!token) {
      alert('Necesitás iniciar sesión antes de realizar la compra.');
      window.location.href =
        './login.html?returnTo=' +
        encodeURIComponent('./carrito.html');
      return;
    }

    isCheckingOut = true;

    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.setAttribute('aria-busy', 'true');
    }

    try {
      const response = await fetch(`${API_URL}/compras`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ items })
      });

      let result;

      try {
        result = await response.json();
      } catch (_) {
        result = null;
      }

      if (!response.ok || !result || result.success !== true) {
        const message =
          result?.message ||
          result?.error ||
          'No se pudo completar la compra.';

        throw new Error(message);
      }

      sessionStorage.removeItem(CART_KEY);
      alert('¡Compra realizada correctamente!');

      window.location.href = './mis-compras.html';
    } catch (error) {
      console.error('Error al realizar la compra:', error);

      alert(
        error.message ||
        'No se pudo conectar con el servidor. Revisá que esté iniciado.'
      );
    } finally {
      isCheckingOut = false;

      if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.removeAttribute('aria-busy');
      }
    }
  }

  function initializeCart() {
    if (!cartItemsList) return;

    hydrateCart();

    getItems().forEach(item => initializeItem(item));

    initializeCoupons();

    checkoutBtn?.addEventListener('click', event => {
      event.preventDefault();
      checkout();
    });

    checkEmptyCart();
    updateSummary();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCart);
  } else {
    initializeCart();
  }
})();
