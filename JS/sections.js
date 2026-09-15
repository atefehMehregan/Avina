/* ============================================================================
 * sections.js — بخش‌هایی که از روی داده ساخته می‌شوند
 * ----------------------------------------------------------------------------
 * دسته‌ها، برندها، روتین پوست، مجله، اعتماد مشتری و فوتر. هیچ‌کدام از این
 * محتواها در HTML نوشته نشده‌اند تا اضافه کردن یک مورد تازه فقط یک خط در
 * data.js باشد.
 * ==========================================================================*/

/** کارت‌های دسته‌بندی. کلیک روی هر کدام فهرست محصولات را فیلتر می‌کند. */
function renderCategories() {
  const grid = find('#category-grid');
  if (!grid) return;

  fill(grid, CATEGORIES.map((cat) => {
    const card = el('a', 'category-card');
    card.href = '#catalog';

    const image = el('img');
    image.src = cat.image;
    image.alt = cat.label;
    image.loading = 'lazy';

    const body = el('div', 'category-card__body');
    body.append(el('h3', 'category-card__title', cat.label),
                el('p', 'category-card__caption', cat.caption));

    card.append(image, body);
    card.addEventListener('click', () => {
      catalogState.category = cat.id;
      catalogState.concern = null;
      renderCatalog();
      syncFilterButtons();
    });
    return card;
  }));
}

/** نوار برندها. */
function renderBrands() {
  const strip = find('#brand-strip');
  if (!strip) return;

  fill(strip, BRANDS.map((brand) => {
    const chip = el('a', 'brand-chip');
    chip.href = '#catalog';
    chip.setAttribute('aria-label', 'محصولات ' + brand.label);

    const logo = el('img');
    logo.src = brand.logo;
    logo.alt = brand.label;
    logo.loading = 'lazy';

    chip.append(logo);
    return chip;
  }));
}

/**
 * بخش روتین پوست.
 * مراحل شماره‌گذاری شده‌اند چون واقعا ترتیب دارند — شماره اینجا اطلاعات است،
 * نه تزئین.
 */
const ROUTINE_STEPS = [
  { title: 'پاک‌سازی', text: 'شست‌وشوی ملایم صبح و شب، متناسب با نوع پوست.' },
  { title: 'درمان', text: 'سرم اختصاصی برای نیاز اصلی پوست شما.' },
  { title: 'آبرسانی', text: 'قفل کردن رطوبت با کرمی که سنگینی نکند.' },
  { title: 'محافظت', text: 'ضدآفتاب هر روز، حتی در روزهای ابری.' },
];

function renderRoutine() {
  const steps = find('#routine-steps');
  if (steps) {
    fill(steps, ROUTINE_STEPS.map((step, index) => {
      const row = el('div', 'routine__step');
      row.append(el('span', 'routine__num', String(index + 1).padStart(2, '0')));

      const body = el('div');
      body.append(el('h3', null, step.title), el('p', null, step.text));
      row.append(body);
      return row;
    }));
  }

  const grid = find('#concern-grid');
  if (!grid) return;

  fill(grid, CONCERNS.map((concern) => {
    const matches = PRODUCTS.filter((p) => p.concerns.indexOf(concern.id) !== -1).length;

    const card = el('button', 'concern-card');
    card.type = 'button';
    card.dataset.concern = concern.id;
    card.append(
      el('strong', null, concern.label),
      el('span', null, concern.caption),
      el('span', 'concern-card__count', fa(matches) + ' محصول پیشنهادی')
    );

    card.addEventListener('click', () => {
      /* کلیک دوباره روی همان نیاز، فیلتر را برمی‌دارد. */
      const same = catalogState.concern === concern.id;
      catalogState.concern = same ? null : concern.id;
      catalogState.category = 'all';
      renderCatalog();
      syncFilterButtons();

      const target = find('#catalog');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
      if (!same) toast('محصولات مناسب «' + concern.label + '» نمایش داده شد.', 'info');
    });

    return card;
  }));
}

/** بخش مجله زیبایی. */
function renderPosts() {
  const grid = find('#post-grid');
  if (!grid) return;

  fill(grid, POSTS.map((post) => {
    const card = el('article', 'post-card');

    const link = el('a');
    link.href = post.url || '#';
    link.setAttribute('aria-label', post.title);

    const media = el('div', 'post-card__media');
    const image = el('img');
    image.src = post.image;
    image.alt = '';
    image.loading = 'lazy';
    media.append(image);

    const meta = el('div', 'post-card__meta');
    meta.append(el('span', 'post-card__cat', post.category),
                el('span', null, '•'),
                el('span', null, 'مطالعه ' + post.readingTime));

    link.append(media, meta,
                el('h3', 'post-card__title', post.title),
                el('p', 'post-card__excerpt', post.excerpt));
    card.append(link);
    return card;
  }));
}

/** بخش اعتماد مشتری. */
function renderTrust() {
  const grid = find('#trust-grid');
  if (!grid) return;

  fill(grid, TRUST.map((item) => {
    const row = el('div', 'trust__item');
    const badge = el('div', 'trust__icon');
    badge.append(icon(item.icon));

    const body = el('div');
    body.append(el('h3', null, item.title), el('p', null, item.text));

    row.append(badge, body);
    return row;
  }));
}

/** فوتر: ستون‌های لینک، اطلاعات تماس و نشان‌ها. */
function renderFooter() {
  const columns = find('#footer-columns');
  if (columns) {
    fill(columns, FOOTER_MENUS.map((menu) => {
      const col = el('div', 'footer__col');
      col.append(el('h3', null, menu.title));

      const nav = el('nav');
      const list = el('ul');
      for (const label of menu.links) {
        const item = el('li');
        const link = el('a', null, label);
        link.href = '#';
        item.append(link);
        list.append(item);
      }
      nav.append(list);
      col.append(nav);
      return col;
    }));
  }

  const contact = find('#footer-contact');
  if (contact) {
    const rows = [
      { glyph: 'call', text: STORE.phone },
      { glyph: 'mail', text: STORE.email },
      { glyph: 'location_on', text: STORE.address },
    ];
    fill(contact, rows.map((row) => {
      const item = el('li');
      item.append(icon(row.glyph), el('span', null, row.text));
      return item;
    }));
  }

  const badges = find('#footer-badges');
  if (badges) {
    fill(badges, PAYMENT_BADGES.map((label) => el('span', 'footer__badge', label)));
  }

  const year = find('#footer-year');
  if (year) year.textContent = fa(new Date().getFullYear() - 621);  /* تقریب سال شمسی */
}

/** متن‌های بخش پیشنهاد ویژه از data.js خوانده می‌شوند. */
function renderOffer() {
  const title = find('#offer-title');
  const sub = find('#offer-sub');
  const text = find('#offer-text');
  const image = find('#offer-image');

  if (title) title.textContent = OFFER.title;
  if (sub) sub.textContent = OFFER.subtitle;
  if (text) text.textContent = OFFER.text;
  if (image) { image.src = OFFER.image; image.alt = OFFER.title; }
}
