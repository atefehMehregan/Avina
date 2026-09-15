/* ============================================================================
 * storage.js — نگهداری سبد خرید و علاقه‌مندی‌ها در مرورگر
 * ----------------------------------------------------------------------------
 * localStorage ممکن است خاموش باشد (حالت ناشناس، تنظیمات مرورگر) و در آن حالت
 * حتی خواندن هم خطا می‌دهد. برای همین همه‌جا داخل try/catch است: اگر ذخیره
 * ممکن نباشد سایت کار می‌کند، فقط بین بازدیدها چیزی به یاد نمی‌آورد.
 * ==========================================================================*/

const STORAGE_KEYS = {
  cart: 'avina.cart',
  wishlist: 'avina.wishlist',
  prefs: 'avina.prefs',
};

/** خواندن یک مقدار JSON از حافظه مرورگر. */
function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (error) {
    /* حافظه در دسترس نیست یا داده خراب است — با مقدار پیش‌فرض ادامه می‌دهیم. */
    return fallback;
  }
}

/** نوشتن یک مقدار در حافظه مرورگر. */
function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}
