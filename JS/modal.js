/* ============================================================================
 * modal.js — پنجره‌های شناور و کشوها
 * ----------------------------------------------------------------------------
 * این فایل فقط باز و بسته کردن را می‌داند، نه محتوای داخل پنجره را. همان کد
 * برای مودال نگاه سریع، کشوی سبد خرید و منوی موبایل استفاده می‌شود.
 *
 * نکته‌های دسترس‌پذیری که اینجا رعایت شده:
 *   - کلید Escape می‌بندد
 *   - کلیک روی پس‌زمینه تیره می‌بندد
 *   - کلید Tab از داخل پنجره بیرون نمی‌رود
 *   - بعد از بستن، فوکوس به همان دکمه‌ای که باز کرده بود برمی‌گردد
 * ==========================================================================*/

const layerState = {
  open: null,        // عنصری که الان باز است
  lastFocus: null,   // چیزی که پیش از باز شدن فوکوس داشت
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(scope) {
  return findAll(FOCUSABLE, scope).filter((node) => !node.hasAttribute('hidden'));
}

/**
 * باز کردن یک لایه.
 * @param {Element} layer   مودال، کشو یا منو
 * @param {boolean} isModal آیا عنصر با ویژگی hidden پنهان شده است
 */
function openLayer(layer, isModal) {
  if (!layer || layerState.open) return;

  layerState.lastFocus = document.activeElement;
  layerState.open = layer;

  if (isModal) layer.hidden = false;
  layer.classList.add('is-open');
  layer.setAttribute('aria-hidden', 'false');

  const overlay = find('#overlay');
  if (overlay) overlay.classList.add('is-open');
  document.body.classList.add('is-locked');

  const targets = focusables(layer);
  if (targets.length) targets[0].focus();
}

/** بستن لایه باز. */
function closeLayer() {
  const layer = layerState.open;
  if (!layer) return;

  layer.classList.remove('is-open');
  layer.setAttribute('aria-hidden', 'true');
  /* مودال‌ها با hidden پنهان می‌شوند، کشوها با transform. */
  if (layer.classList.contains('modal')) layer.hidden = true;

  const overlay = find('#overlay');
  if (overlay) overlay.classList.remove('is-open');
  document.body.classList.remove('is-locked');

  layerState.open = null;
  if (layerState.lastFocus && layerState.lastFocus.focus) layerState.lastFocus.focus();
  layerState.lastFocus = null;
}

/** نگه داشتن کلید Tab داخل لایه باز. */
function trapFocus(event) {
  const layer = layerState.open;
  if (!layer) return;

  const targets = focusables(layer);
  if (!targets.length) return;

  const first = targets[0];
  const last = targets[targets.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/** راه‌اندازی رفتار مشترک همه لایه‌ها. یک بار در شروع صدا زده می‌شود. */
function setupLayers() {
  document.addEventListener('keydown', (event) => {
    if (!layerState.open) return;
    if (event.key === 'Escape') closeLayer();
    if (event.key === 'Tab') trapFocus(event);
  });

  /* هر عنصری با data-close-layer لایه را می‌بندد. */
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-layer]')) closeLayer();
  });
}

/* ------------------------------------------------------- نگاه سریع محصول */

/** ساخت و باز کردن پنجره نگاه سریع برای یک محصول. */
function openQuickView(productId) {
  const product = productById(productId);
  const modal = find('#quick-modal');
  const body = find('#quick-body');
  if (!product || !modal || !body) return;

  const media = el('div', 'quick__media');
  const image = el('img');
  image.src = product.image;
  image.alt = product.name;
  media.append(image);

  const info = el('div', 'quick__body');
  info.append(
    el('p', 'quick__brand', brandLabel(product.brand)),
    el('h2', 'quick__name', product.name),
    ratingStars(product.rating)
  );

  const price = el('div', 'price');
  price.append(el('strong', 'price__now num', money(product.price)));
  price.append(el('span', 'price__unit', 'تومان'));
  if (product.oldPrice) {
    price.append(el('del', 'price__old num', money(product.oldPrice)));
    price.append(el('span', 'badge badge--sale', fa(discountPercent(product)) + '٪ تخفیف'));
  }
  info.append(price);

  info.append(el('p', 'quick__short', product.short));

  const meta = el('div', 'quick__meta');
  meta.append(
    el('span', null, 'دسته: ' + categoryLabel(product.category)),
    el('span', null, 'حجم: ' + product.volume),
    el('span', null, fa(product.reviews) + ' دیدگاه ثبت‌شده')
  );
  info.append(meta);

  const actions = el('div', 'quick__actions');

  const add = el('button', 'btn btn--primary');
  add.type = 'button';
  add.append(icon('shopping_bag'), document.createTextNode('افزودن به سبد'));
  add.addEventListener('click', () => {
    addToCart(product.id);
    closeLayer();
  });

  const wish = el('button', 'btn btn--ghost');
  wish.type = 'button';
  const inWishlist = isWishlisted(product.id);
  wish.append(icon(inWishlist ? 'favorite' : 'favorite_border'),
              document.createTextNode(inWishlist ? 'در علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی'));
  wish.addEventListener('click', () => {
    toggleWishlist(product.id);
    closeLayer();
  });

  actions.append(add, wish);
  info.append(actions);

  const layout = el('div', 'quick');
  layout.append(media, info);
  fill(body, [layout]);

  openLayer(modal, true);
}
