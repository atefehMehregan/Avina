/* ============================================================================
 * utils.js — ابزارهای کوچک مشترک
 * ----------------------------------------------------------------------------
 * هیچ‌کدام از این توابع چیزی درباره فروشگاه نمی‌دانند؛ فقط کار بقیه فایل‌ها را
 * کوتاه‌تر و خواناتر می‌کنند.
 * ==========================================================================*/

/** یک عنصر را پیدا می‌کند. */
function find(selector, scope) {
  return (scope || document).querySelector(selector);
}

/** همه عناصر منطبق را به شکل آرایه برمی‌گرداند. */
function findAll(selector, scope) {
  return Array.from((scope || document).querySelectorAll(selector));
}

/**
 * ساخت یک عنصر در یک خط.
 *   el('p', 'note', 'سلام')  →  <p class="note">سلام</p>
 */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

/** محتوای یک عنصر را با فرزندان تازه جایگزین می‌کند. */
function fill(node, children) {
  node.replaceChildren(...children);
}

/** آیکون متریال. */
function icon(name) {
  const node = el('span', 'material-symbols-rounded', name);
  node.setAttribute('aria-hidden', 'true');
  return node;
}

/* ------------------------------------------------------------------ اعداد */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** ۱۲۳ → ۱۲۳ (ارقام فارسی) */
function fa(value) {
  return String(value).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[d]);
}

/** ارقام فارسی را برای محاسبه به انگلیسی برمی‌گرداند. */
function toEnglishDigits(text) {
  return String(text).replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));
}

/** ۴۸۶۰۰۰ → «۴۸۶٬۰۰۰» */
function money(amount) {
  return fa(Math.round(amount).toLocaleString('en-US')).replace(/,/g, '٬');
}

/** درصد تخفیف بین قیمت قدیم و جدید. */
function discountPercent(product) {
  if (!product.oldPrice || product.oldPrice <= product.price) return 0;
  return Math.round((1 - product.price / product.oldPrice) * 100);
}

/* ------------------------------------------------------------- ستاره‌ها */

/**
 * ستاره‌های امتیاز.
 * ستاره پر برای هر واحد کامل و یک ستاره نیمه برای باقی‌مانده.
 */
function ratingStars(value) {
  const wrap = el('span', 'rating');
  const stars = el('span', 'rating__stars');

  for (let i = 1; i <= 5; i += 1) {
    let glyph = '☆';
    if (value >= i) glyph = '★';
    else if (value >= i - 0.5) glyph = '⯨';
    stars.append(document.createTextNode(glyph));
  }

  wrap.append(stars, el('span', 'rating__value', fa(value.toFixed(1))));
  wrap.setAttribute('aria-label', `امتیاز ${fa(value.toFixed(1))} از ۵`);
  return wrap;
}

/* ------------------------------------------------------------ جست‌وجوها */

/** یک محصول را با شناسه پیدا می‌کند. */
function productById(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}

/** نام فارسی برند از روی شناسه. */
function brandLabel(id) {
  const brand = BRANDS.find((b) => b.id === id);
  return brand ? brand.label : id;
}

/** نام فارسی دسته از روی شناسه. */
function categoryLabel(id) {
  const cat = CATEGORIES.find((c) => c.id === id);
  return cat ? cat.label : id;
}

/**
 * تاخیر انداختن اجرای یک تابع تا وقتی کاربر دست از تایپ بردارد.
 * برای جستجوی زنده لازم است تا با هر کلید کل فهرست دوباره ساخته نشود.
 */
function debounce(fn, wait) {
  let timer = null;
  return function debounced() {
    const args = arguments;
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(null, args), wait);
  };
}

/**
 * تماشای اندازه صفحه با احتیاط: در برخی مرورگرهای قدیمی و ابزارهای تست
 * matchMedia وجود ندارد و نبود آن نباید کل صفحه را از کار بیندازد.
 */
function watchMedia(query, onChange) {
  if (typeof window.matchMedia !== 'function') return { matches: false };

  const mq = window.matchMedia(query);
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
  else if (typeof mq.addListener === 'function') mq.addListener(onChange);
  return mq;
}

const MOBILE_QUERY = '(max-width: 768px)';
