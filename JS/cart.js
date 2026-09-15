/* ============================================================================
 * cart.js — سبد خرید
 * ----------------------------------------------------------------------------
 * سبد آرایه‌ای از { id, qty } است. قیمت‌ها هنگام نمایش از PRODUCTS خوانده
 * می‌شوند، نه از حافظه — تا اگر قیمتی در data.js عوض شد، سبد قدیمی کاربر
 * قیمت قدیمی را نشان ندهد.
 * ==========================================================================*/

const FREE_SHIPPING_FROM = 1500000;
const SHIPPING_COST = 69000;
const MAX_QTY = 10;

let cart = readStore(STORAGE_KEYS.cart, []);

/** خط مربوط به یک محصول در سبد. */
function cartLine(productId) {
  return cart.find((line) => line.id === productId) || null;
}

/** تعداد کل اقلام سبد. */
function cartCount() {
  return cart.reduce((sum, line) => sum + line.qty, 0);
}

/** جمع قیمت کالاها. */
function cartSubtotal() {
  return cart.reduce((sum, line) => {
    const product = productById(line.id);
    return product ? sum + product.price * line.qty : sum;
  }, 0);
}

/** مجموع تخفیف‌ها، برای نمایش در خلاصه سبد. */
function cartSavings() {
  return cart.reduce((sum, line) => {
    const product = productById(line.id);
    if (!product || !product.oldPrice) return sum;
    return sum + (product.oldPrice - product.price) * line.qty;
  }, 0);
}

/** هزینه ارسال؛ بالای سقف مشخص رایگان می‌شود. */
function cartShipping() {
  if (cart.length === 0) return 0;
  return cartSubtotal() >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;
}

/* ------------------------------------------------------------ تغییر سبد */

function persistCart() {
  writeStore(STORAGE_KEYS.cart, cart);
  renderCart();
}

/** افزودن یک محصول به سبد. */
function addToCart(productId, quantity) {
  const product = productById(productId);
  if (!product) return;

  const amount = quantity || 1;
  const line = cartLine(productId);

  if (line) {
    if (line.qty >= MAX_QTY) {
      toast('حداکثر ' + fa(MAX_QTY) + ' عدد از هر کالا قابل سفارش است.', 'error');
      return;
    }
    line.qty = Math.min(MAX_QTY, line.qty + amount);
  } else {
    cart.push({ id: productId, qty: Math.min(MAX_QTY, amount) });
  }

  persistCart();
  toast('«' + product.name + '» به سبد اضافه شد.');
}

/** کم یا زیاد کردن تعداد یک قلم. */
function changeQty(productId, delta) {
  const line = cartLine(productId);
  if (!line) return;

  const next = line.qty + delta;
  if (next < 1) {
    removeFromCart(productId);
    return;
  }
  if (next > MAX_QTY) {
    toast('حداکثر ' + fa(MAX_QTY) + ' عدد از هر کالا قابل سفارش است.', 'error');
    return;
  }

  line.qty = next;
  persistCart();
}

/** حذف یک قلم از سبد. */
function removeFromCart(productId) {
  const product = productById(productId);
  cart = cart.filter((line) => line.id !== productId);
  persistCart();
  if (product) toast('«' + product.name + '» از سبد حذف شد.', 'info');
}

/** خالی کردن کامل سبد. */
function clearCart() {
  if (cart.length === 0) return;
  cart = [];
  persistCart();
  toast('سبد خرید خالی شد.', 'info');
}

/* ------------------------------------------------------------- نمایش سبد */

/** یک ردیف از کشوی سبد. */
function renderCartLine(line) {
  const product = productById(line.id);
  if (!product) return null;

  const row = el('article', 'cart-line');

  const media = el('div', 'cart-line__media');
  const image = el('img');
  image.src = product.image;
  image.alt = product.name;
  image.loading = 'lazy';
  media.append(image);

  const body = el('div');
  body.append(
    el('p', 'cart-line__brand', brandLabel(product.brand)),
    el('h3', 'cart-line__name', product.name)
  );

  const controls = el('div', 'cart-line__row');

  const qty = el('div', 'qty');
  const minus = el('button', null);
  minus.type = 'button';
  minus.setAttribute('aria-label', 'کاهش تعداد');
  minus.append(icon('remove'));
  minus.addEventListener('click', () => changeQty(product.id, -1));

  const plus = el('button', null);
  plus.type = 'button';
  plus.setAttribute('aria-label', 'افزایش تعداد');
  plus.append(icon('add'));
  plus.disabled = line.qty >= MAX_QTY;
  plus.addEventListener('click', () => changeQty(product.id, 1));

  qty.append(minus, el('span', 'qty__value num', fa(line.qty)), plus);

  const price = el('span', 'cart-line__price num', money(product.price * line.qty) + ' تومان');
  controls.append(qty, price);

  const remove = el('button', 'cart-line__remove', 'حذف');
  remove.type = 'button';
  remove.addEventListener('click', () => removeFromCart(product.id));

  const footRow = el('div', 'cart-line__row');
  footRow.append(remove);

  body.append(controls, footRow);
  row.append(media, body);
  return row;
}

/** بازکشیدن کامل کشوی سبد و شمارنده هدر. */
function renderCart() {
  const badge = find('#cart-count');
  if (badge) {
    const count = cartCount();
    badge.textContent = fa(count);
    badge.classList.toggle('is-visible', count > 0);
  }

  const body = find('#cart-body');
  const foot = find('#cart-foot');
  if (!body || !foot) return;

  if (cart.length === 0) {
    const empty = el('div', 'empty-state');
    empty.append(icon('shopping_bag'), el('p', null, 'سبد خرید شما خالی است.'));
    const cta = el('button', 'btn btn--ghost btn--sm', 'دیدن پرفروش‌ها');
    cta.type = 'button';
    cta.setAttribute('data-close-layer', '');
    cta.addEventListener('click', () => {
      const target = find('#bestsellers');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
    empty.append(cta);
    fill(body, [empty]);
    fill(foot, []);
    return;
  }

  fill(body, cart.map(renderCartLine).filter(Boolean));

  const summary = el('div', 'cart-summary');

  const sub = el('div', 'cart-summary__row');
  sub.append(el('span', null, 'جمع کالاها'), el('span', 'num', money(cartSubtotal()) + ' تومان'));
  summary.append(sub);

  const savings = cartSavings();
  if (savings > 0) {
    const row = el('div', 'cart-summary__row');
    row.append(el('span', null, 'سود شما از خرید'), el('span', 'num', money(savings) + ' تومان'));
    summary.append(row);
  }

  const shipping = cartShipping();
  const ship = el('div', 'cart-summary__row');
  ship.append(el('span', null, 'هزینه ارسال'),
              el('span', 'num', shipping === 0 ? 'رایگان' : money(shipping) + ' تومان'));
  summary.append(ship);

  if (shipping > 0) {
    const remaining = FREE_SHIPPING_FROM - cartSubtotal();
    summary.append(el('p', 'cart-summary__row',
      'تا ' + money(remaining) + ' تومان دیگر تا ارسال رایگان'));
  }

  const total = el('div', 'cart-summary__row cart-summary__row--total');
  total.append(el('span', null, 'مبلغ قابل پرداخت'),
               el('span', 'num', money(cartSubtotal() + shipping) + ' تومان'));
  summary.append(total);

  const checkout = el('button', 'btn btn--primary btn--block', 'تکمیل خرید');
  checkout.type = 'button';
  checkout.addEventListener('click', () => {
    /* پرداخت واقعی به سرور و درگاه بانکی نیاز دارد — README را ببینید. */
    toast('ثبت سفارش به سرور و درگاه پرداخت نیاز دارد.', 'info');
  });

  const clear = el('button', 'cart-clear', 'خالی کردن سبد');
  clear.type = 'button';
  clear.className = 'cart-line__remove';
  clear.style.marginTop = '0.9rem';
  clear.style.display = 'block';
  clear.style.marginInline = 'auto';
  clear.addEventListener('click', clearCart);

  fill(foot, [summary, checkout, clear]);
}
