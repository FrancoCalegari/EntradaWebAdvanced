/**
 * ENTRADAWEB — Lógica del Carrito de Compras
 * Rol: Santiago Morales (Frontend)
 *
 * Implementa:
 * - Selector de cantidad por item (mín 1, máx configurable por data-max-qty)
 * - Recálculo dinámico de subtotal por item, subtotal global, cargo de servicio y total
 * - Eliminación de items con animación y detección de carrito vacío
 * - Validación y aplicación de cupones de descuento
 * - aria-live en el total para anuncios de lectores de pantalla
 * - Persistencia en sessionStorage (handoff para integración con backend)
 */

(function () {
  'use strict';

  /* ─── CONFIGURACIÓN ──────────────────────────────────────────── */
  const FEE_RATE        = 0.10;  // Cargo por servicio: 10%
  const VALID_COUPONS   = {      // Cupones válidos (mock — backend los validará realmente)
    'ENTRADAS10': 0.10,
    'EWFEST20':   0.20,
    'PRIMERAVEZ': 0.15,
  };

  /* ─── REFERENCIAS DOM ────────────────────────────────────────── */
  const cartItemsList   = document.getElementById('cart-items-list');
  const cartEmpty       = document.getElementById('cart-empty');
  const cartLayout      = document.querySelector('.cart-layout');
  const couponForm      = document.getElementById('coupon-form');
  const couponInput     = document.getElementById('coupon-input');
  const couponFeedback  = document.getElementById('coupon-feedback');
  const sDiscountRow    = document.getElementById('s-discount-row');
  const sDiscount       = document.getElementById('s-discount');
  const sSubtotal       = document.getElementById('s-subtotal');
  const sFee            = document.getElementById('s-fee');
  const sTotal          = document.getElementById('s-total');
  const navCartCount    = document.getElementById('nav-cart-count');

  /* ─── ESTADO ─────────────────────────────────────────────────── */
  let discountRate = 0;

  /* ─── UTILS ──────────────────────────────────────────────────── */
  const fmt = (n) => `$${Math.round(n).toLocaleString('es-AR')}`;

  /* ─── OBTENER ITEMS DEL DOM ──────────────────────────────────── */
  function getItems() {
    return [...document.querySelectorAll('#cart-items-list .cart-item')];
  }

  /* ─── PRECIO DE UN ITEM ──────────────────────────────────────── */
  function getItemTotal(item) {
    const price = parseInt(item.dataset.price, 10) || 0;
    const qty   = parseInt(item.querySelector('[data-qty]')?.dataset.qty ?? 1, 10);
    return price * qty;
  }

  /* ─── ACTUALIZAR RESUMEN GLOBAL ──────────────────────────────── */
  function updateGlobalSummary() {
    const items     = getItems();
    const subtotal  = items.reduce((acc, item) => acc + getItemTotal(item), 0);
    const discount  = Math.round(subtotal * discountRate);
    const base      = subtotal - discount;
    const fee       = Math.round(base * FEE_RATE);
    const total     = base + fee;

    if (sSubtotal) sSubtotal.textContent = fmt(subtotal);
    if (sFee)      sFee.textContent      = fmt(fee);
    if (sTotal) {
      sTotal.textContent  = fmt(total);
      sTotal.setAttribute('aria-label', `Total ${fmt(total)}`);
    }

    // Fila de descuento
    if (sDiscountRow && sDiscount) {
      if (discountRate > 0 && discount > 0) {
        sDiscountRow.style.display = '';
        sDiscount.textContent = `-${fmt(discount)}`;
      } else {
        sDiscountRow.style.display = 'none';
      }
    }

    // Contador de items en el nav
    const totalQty = items.reduce((acc, item) => {
      return acc + parseInt(item.querySelector('[data-qty]')?.dataset.qty ?? 1, 10);
    }, 0);
    if (navCartCount) {
      navCartCount.textContent = totalQty;
      navCartCount.setAttribute('aria-label', `${totalQty} item${totalQty !== 1 ? 's' : ''} en el carrito`);
    }

    // Persistir en sessionStorage
    try {
      const cartData = items.map(item => ({
        id:    item.dataset.itemId,
        price: parseInt(item.dataset.price, 10),
        qty:   parseInt(item.querySelector('[data-qty]')?.dataset.qty ?? 1, 10),
      }));
      sessionStorage.setItem('ew_cart', JSON.stringify(cartData));
    } catch (_) { /* silenciar */ }
  }

  /* ─── CONTROLES DE CANTIDAD ──────────────────────────────────── */
  function initQuantityControls(item) {
    const decreaseBtn  = item.querySelector('[data-action="decrease"]');
    const increaseBtn  = item.querySelector('[data-action="increase"]');
    const qtyEl        = item.querySelector('[data-qty]');
    const itemTotalEl  = item.querySelector('[data-item-total]');
    const price        = parseInt(item.dataset.price, 10) || 0;
    const maxQty       = parseInt(item.dataset.maxQty, 10) || 8;
    const MIN          = 1;

    if (!qtyEl) return;

    function updateQtyUI() {
      const qty = parseInt(qtyEl.dataset.qty, 10);

      qtyEl.textContent = qty;
      qtyEl.setAttribute('aria-valuenow', qty);
      qtyEl.setAttribute('aria-label', `${qty} entrada${qty !== 1 ? 's' : ''}`);

      if (decreaseBtn) decreaseBtn.disabled = qty <= MIN;
      if (increaseBtn) increaseBtn.disabled = qty >= maxQty;

      if (itemTotalEl) {
        itemTotalEl.textContent = fmt(price * qty);
      }

      updateGlobalSummary();
    }

    if (decreaseBtn) {
      decreaseBtn.addEventListener('click', () => {
        const qty = parseInt(qtyEl.dataset.qty, 10);
        if (qty > MIN) {
          qtyEl.dataset.qty = qty - 1;
          updateQtyUI();
        }
      });
    }

    if (increaseBtn) {
      increaseBtn.addEventListener('click', () => {
        const qty = parseInt(qtyEl.dataset.qty, 10);
        if (qty < maxQty) {
          qtyEl.dataset.qty = qty + 1;
          updateQtyUI();
        }
      });
    }
  }

  /* ─── ELIMINAR ITEM ──────────────────────────────────────────── */
  function initRemoveButton(item) {
    const removeBtn = item.querySelector('.cart-item__remove');
    if (!removeBtn) return;

    removeBtn.addEventListener('click', () => {
      // Animación de salida
      item.style.transition = 'opacity 250ms ease, transform 250ms ease, max-height 350ms ease, margin 350ms ease, padding 350ms ease';
      item.style.opacity  = '0';
      item.style.transform = 'scale(0.96) translateX(8px)';
      item.style.maxHeight = item.offsetHeight + 'px';
      item.style.overflow  = 'hidden';

      requestAnimationFrame(() => {
        item.style.maxHeight = '0';
        item.style.marginTop = '0';
        item.style.paddingTop = '0';
        item.style.paddingBottom = '0';
        item.style.borderWidth = '0';
      });

      setTimeout(() => {
        item.remove();
        updateGlobalSummary();
        checkEmptyCart();

        // Anuncio accesible de eliminación
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'assertive');
        announcement.setAttribute('role', 'status');
        announcement.className = 'sr-only';
        announcement.textContent = 'Entrada eliminada del carrito.';
        document.body.appendChild(announcement);
        setTimeout(() => announcement.remove(), 2000);
      }, 380);
    });
  }

  /* ─── VERIFICAR CARRITO VACÍO ────────────────────────────────── */
  function checkEmptyCart() {
    const items = getItems();
    if (items.length === 0) {
      if (cartLayout)      cartLayout.style.display = 'none';
      if (cartEmpty)       cartEmpty.hidden = false;
    } else {
      if (cartLayout)      cartLayout.style.display = '';
      if (cartEmpty)       cartEmpty.hidden = true;
    }
  }

  /* ─── CUPÓN DE DESCUENTO ─────────────────────────────────────── */
  if (couponForm) {
    couponForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!couponFeedback) return;

      const code     = (couponInput?.value || '').trim().toUpperCase();
      const rate     = VALID_COUPONS[code];

      // Limpiar estado anterior
      couponFeedback.className = '';
      couponFeedback.textContent = '';

      if (!code) {
        couponFeedback.className = 'cart-coupon__feedback cart-coupon__feedback--error';
        couponFeedback.innerHTML = '<span aria-hidden="true">⚠</span> Ingresá un código de cupón.';
        return;
      }

      if (rate !== undefined) {
        discountRate = rate;
        updateGlobalSummary();
        couponFeedback.className = 'cart-coupon__feedback cart-coupon__feedback--success';
        couponFeedback.innerHTML = `<span aria-hidden="true">✓</span> Cupón aplicado: ${Math.round(rate * 100)}% de descuento.`;
        if (couponInput) {
          couponInput.readOnly = true;
          couponInput.style.opacity = '0.6';
        }
      } else {
        discountRate = 0;
        updateGlobalSummary();
        couponFeedback.className = 'cart-coupon__feedback cart-coupon__feedback--error';
        couponFeedback.innerHTML = '<span aria-hidden="true">✕</span> El código ingresado no es válido.';
      }
    });
  }

  /* ─── BOTÓN CONTINUAR CON EL PAGO ───────────────────────────── */
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      // TODO: Navegar al paso 2 (Datos del comprador) — Lucas lo conectará al backend
      console.info('[EntradaWeb] Continuando con el pago. Carrito:', sessionStorage.getItem('ew_cart'));
      alert('⚙️ El proceso de pago se conectará con el backend en la Estación 4 (Lucas Profe — Integración).');
    });
  }

  /* ─── INICIALIZACIÓN ─────────────────────────────────────────── */
  getItems().forEach(item => {
    initQuantityControls(item);
    initRemoveButton(item);
  });

  // Siempre forzamos el estado correcto al cargar la página.
  // No dependemos únicamente del atributo HTML `hidden` inicial.
  (function enforceInitialState() {
    const items = getItems();
    const hasItems = items.length > 0;

    if (cartLayout) {
      cartLayout.style.display = hasItems ? '' : 'none';
    }
    if (cartEmpty) {
      // Usamos tanto el atributo como el estilo para máxima compatibilidad
      cartEmpty.hidden = !hasItems;
      cartEmpty.style.display = hasItems ? 'none' : '';
    }
  })();

  updateGlobalSummary();

})();
