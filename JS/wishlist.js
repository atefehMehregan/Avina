/* ============================================================================
 * wishlist.js — فهرست علاقه‌مندی‌ها
 * ----------------------------------------------------------------------------
 * فهرست فقط آرایه‌ای از شناسه محصول است و در حافظه مرورگر ذخیره می‌شود.
 * ==========================================================================*/

let wishlist = readStore(STORAGE_KEYS.wishlist, []);

/** آیا این محصول در علاقه‌مندی‌هاست؟ */
function isWishlisted(productId) {
  return wishlist.indexOf(productId) !== -1;
}

/** افزودن یا برداشتن یک محصول از علاقه‌مندی‌ها. */
function toggleWishlist(productId) {
  const product = productById(productId);
  if (!product) return;

  const at = wishlist.indexOf(productId);
  if (at === -1) {
    wishlist.push(productId);
    toast('«' + product.name + '» به علاقه‌مندی‌ها اضافه شد.');
  } else {
    wishlist.splice(at, 1);
    toast('«' + product.name + '» از علاقه‌مندی‌ها حذف شد.', 'info');
  }

  writeStore(STORAGE_KEYS.wishlist, wishlist);
  refreshWishlistUI();
}

/** به‌روزرسانی شمارنده هدر و همه دکمه‌های قلب روی صفحه. */
function refreshWishlistUI() {
  const count = find('#wishlist-count');
  if (count) {
    count.textContent = fa(wishlist.length);
    count.classList.toggle('is-visible', wishlist.length > 0);
  }

  for (const button of findAll('.product-card__wish')) {
    const active = isWishlisted(button.dataset.id);
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', active ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها');
    const glyph = button.querySelector('.material-symbols-rounded');
    if (glyph) glyph.textContent = active ? 'favorite' : 'favorite_border';
  }
}
