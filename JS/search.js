/* ============================================================================
 * search.js — جستجوی زنده محصولات
 * ----------------------------------------------------------------------------
 * با هر کلید، نام و برند و دسته محصولات جستجو می‌شود و چند نتیجه اول زیر
 * کادر جستجو می‌آید. debounce باعث می‌شود تا کاربر دست از تایپ برندارد
 * فهرست دوباره ساخته نشود.
 * ==========================================================================*/

const SEARCH_LIMIT = 6;

/**
 * نرمال‌سازی متن فارسی برای مقایسه.
 * ی و ک عربی به فارسی تبدیل می‌شوند و اعراب و نیم‌فاصله حذف می‌شود، تا
 * «آبرسان» و «آب رسان» هر دو پیدا شوند.
 */
function normalize(text) {
  return toEnglishDigits(String(text))
    .replace(/[يی]/g, 'ی')
    .replace(/[كک]/g, 'ک')
    .replace(/[ً-ْ‌‏]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** جستجو در محصولات و برگرداندن نتایج. */
function searchProducts(term) {
  const needle = normalize(term);
  if (needle.length < 2) return [];

  return PRODUCTS.filter((product) => {
    const haystack = normalize(
      product.name + ' ' + brandLabel(product.brand) + ' ' +
      categoryLabel(product.category) + ' ' + product.short
    );
    return haystack.indexOf(needle) !== -1;
  });
}

/** ساخت یک ردیف نتیجه. */
function searchResultRow(product) {
  const row = el('button', 'search-result');
  row.type = 'button';

  const image = el('img');
  image.src = product.image;
  image.alt = '';
  image.loading = 'lazy';

  const text = el('span');
  text.append(el('span', 'search-result__name', product.name),
              el('span', 'search-result__brand', brandLabel(product.brand)));

  row.append(image, text, el('span', 'search-result__price num', money(product.price) + ' تومان'));
  row.addEventListener('click', () => openQuickView(product.id));
  return row;
}

/** راه‌اندازی یک کادر جستجو. برای هدر و منوی موبایل جداگانه صدا زده می‌شود. */
function setupSearch(fieldId, resultsId, clearId) {
  const input = find(fieldId);
  const results = find(resultsId);
  const clear = clearId ? find(clearId) : null;
  if (!input || !results) return;

  function hide() {
    results.hidden = true;
    fill(results, []);
  }

  function run() {
    const term = input.value;
    if (clear) clear.classList.toggle('is-visible', term.length > 0);

    if (normalize(term).length < 2) {
      hide();
      return;
    }

    const matches = searchProducts(term);
    results.hidden = false;

    if (matches.length === 0) {
      fill(results, [el('p', 'search__empty', 'نتیجه‌ای برای «' + term + '» پیدا نشد.')]);
      return;
    }

    fill(results, matches.slice(0, SEARCH_LIMIT).map(searchResultRow));
  }

  input.addEventListener('input', debounce(run, 180));
  input.addEventListener('focus', run);

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      input.value = '';
      if (clear) clear.classList.remove('is-visible');
      hide();
      input.blur();
    }
  });

  if (clear) {
    clear.addEventListener('click', () => {
      input.value = '';
      clear.classList.remove('is-visible');
      hide();
      input.focus();
    });
  }

  /* کلیک بیرون از کادر، فهرست را می‌بندد. */
  document.addEventListener('click', (event) => {
    if (!results.hidden && !event.target.closest(fieldId) && !event.target.closest(resultsId)) {
      hide();
    }
  });
}
