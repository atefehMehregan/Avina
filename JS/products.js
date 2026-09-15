/* ============================================================================
 * products.js — کارت محصول، فیلتر و مرتب‌سازی
 * ----------------------------------------------------------------------------
 * کارت محصول یک بار اینجا ساخته می‌شود و همه بخش‌های صفحه (پرفروش‌ها،
 * جدیدترین‌ها، نتایج فیلتر) از همان استفاده می‌کنند.
 * ==========================================================================*/

/* وضعیت فهرست پرفروش‌ها: کاربر روی چه فیلتری است و چطور مرتب کرده. */
const catalogState = {
  category: 'all',
  sort: 'featured',
  concern: null,
};

/* --------------------------------------------------------------- کارت */

/** ساخت کارت یک محصول. */
function productCard(product) {
  const card = el('article', 'product-card');
  card.dataset.id = product.id;

  /* --- تصویر و دکمه‌های رویش --- */
  const media = el('div', 'product-card__media');
  const image = el('img');
  image.src = product.image;
  image.alt = product.name;
  image.loading = 'lazy';
  media.append(image);

  const badges = el('div', 'product-card__badges');
  const off = discountPercent(product);
  if (off > 0) badges.append(el('span', 'badge badge--sale', fa(off) + '٪'));
  if (product.tags.indexOf('new') !== -1) badges.append(el('span', 'badge badge--new', 'جدید'));
  if (badges.childElementCount) media.append(badges);

  const wish = el('button', 'product-card__wish');
  wish.type = 'button';
  wish.dataset.id = product.id;
  wish.append(icon('favorite_border'));
  wish.addEventListener('click', () => toggleWishlist(product.id));
  media.append(wish);

  const quick = el('button', 'product-card__quick', 'نگاه سریع');
  quick.type = 'button';
  quick.addEventListener('click', () => openQuickView(product.id));
  media.append(quick);

  /* --- متن و قیمت --- */
  const body = el('div', 'product-card__body');
  body.append(el('p', 'product-card__brand', brandLabel(product.brand)));

  const name = el('a', 'product-card__name', product.name);
  name.href = '#';
  name.addEventListener('click', (event) => {
    event.preventDefault();
    openQuickView(product.id);
  });
  body.append(name);

  body.append(ratingStars(product.rating), el('p', 'product-card__volume', product.volume));

  const foot = el('div', 'product-card__foot');
  const price = el('div', 'price');
  price.append(el('strong', 'price__now num', money(product.price)),
               el('span', 'price__unit', 'تومان'));
  if (product.oldPrice) price.append(el('del', 'price__old num', money(product.oldPrice)));
  foot.append(price);

  const actions = el('div', 'product-card__actions');
  const add = el('button', 'btn btn--primary btn--sm');
  add.type = 'button';
  add.append(icon('add_shopping_cart'), document.createTextNode('افزودن'));
  add.addEventListener('click', () => addToCart(product.id));
  actions.append(add);
  foot.append(actions);

  body.append(foot);
  card.append(media, body);
  return card;
}

/** کشیدن فهرستی از محصولات داخل یک ظرف. */
function renderProductList(container, products) {
  if (!container) return;

  if (products.length === 0) {
    const empty = el('div', 'empty-state');
    empty.append(icon('search_off'), el('p', null, 'محصولی با این فیلترها پیدا نشد.'));
    const reset = el('button', 'btn btn--ghost btn--sm', 'حذف فیلترها');
    reset.type = 'button';
    reset.addEventListener('click', () => {
      catalogState.category = 'all';
      catalogState.concern = null;
      renderCatalog();
      syncFilterButtons();
    });
    empty.append(reset);
    empty.style.gridColumn = '1 / -1';
    fill(container, [empty]);
    return;
  }

  fill(container, products.map(productCard));
  refreshWishlistUI();
}

/* ------------------------------------------------------ فیلتر و مرتب‌سازی */

/** مرتب‌سازی یک آرایه محصول بر اساس گزینه انتخابی. */
function sortProducts(list, mode) {
  const sorted = list.slice();

  if (mode === 'price-asc') sorted.sort((a, b) => a.price - b.price);
  else if (mode === 'price-desc') sorted.sort((a, b) => b.price - a.price);
  else if (mode === 'rating') sorted.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  else if (mode === 'discount') sorted.sort((a, b) => discountPercent(b) - discountPercent(a));
  else {
    /* پیشنهاد فروشگاه: اول پرفروش‌ها، بعد امتیاز بالاتر. */
    sorted.sort((a, b) => {
      const aBest = a.tags.indexOf('bestseller') !== -1 ? 1 : 0;
      const bBest = b.tags.indexOf('bestseller') !== -1 ? 1 : 0;
      return bBest - aBest || b.rating - a.rating;
    });
  }

  return sorted;
}

/** اعمال فیلتر دسته و نیاز پوستی. */
function filterProducts(list) {
  return list.filter((product) => {
    if (catalogState.category !== 'all' && product.category !== catalogState.category) return false;
    if (catalogState.concern && product.concerns.indexOf(catalogState.concern) === -1) return false;
    return true;
  });
}

/** کشیدن دوباره فهرست اصلی محصولات. */
function renderCatalog() {
  const grid = find('#catalog-grid');
  if (!grid) return;

  const products = sortProducts(filterProducts(PRODUCTS), catalogState.sort).slice(0, 12);
  renderProductList(grid, products);

  const count = find('#catalog-count');
  if (count) count.textContent = fa(products.length) + ' محصول';
}

/** هماهنگ کردن ظاهر دکمه‌های فیلتر با وضعیت فعلی. */
function syncFilterButtons() {
  for (const button of findAll('.filter')) {
    const active = button.dataset.category === catalogState.category;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  for (const card of findAll('.concern-card')) {
    card.classList.toggle('is-active', card.dataset.concern === catalogState.concern);
  }
}

/** ساخت نوار فیلتر و منوی مرتب‌سازی. */
function renderToolbar() {
  const filters = find('#catalog-filters');
  if (filters) {
    const all = el('button', 'filter is-active', 'همه');
    all.type = 'button';
    all.dataset.category = 'all';

    const buttons = [all].concat(CATEGORIES.map((cat) => {
      const button = el('button', 'filter', cat.label);
      button.type = 'button';
      button.dataset.category = cat.id;
      return button;
    }));

    for (const button of buttons) {
      button.addEventListener('click', () => {
        catalogState.category = button.dataset.category;
        catalogState.concern = null;   /* فیلتر نیاز پوستی با انتخاب دسته پاک می‌شود */
        renderCatalog();
        syncFilterButtons();
      });
    }

    fill(filters, buttons);
  }

  const select = find('#catalog-sort');
  if (select) {
    fill(select, SORT_OPTIONS.map((option) => {
      const node = el('option', null, option.label);
      node.value = option.id;
      return node;
    }));
    select.value = catalogState.sort;
    select.addEventListener('change', () => {
      catalogState.sort = select.value;
      writeStore(STORAGE_KEYS.prefs, { sort: catalogState.sort });
      renderCatalog();
    });
  }
}

/** بخش جدیدترین‌ها — چهار محصول با برچسب new. */
function renderNewArrivals() {
  const grid = find('#new-grid');
  if (!grid) return;
  const items = PRODUCTS.filter((p) => p.tags.indexOf('new') !== -1).slice(0, 4);
  renderProductList(grid, items);
}
