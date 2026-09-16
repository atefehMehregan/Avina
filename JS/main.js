/* ============================================================================
 * main.js — نقطه شروع
 * ----------------------------------------------------------------------------
 * بقیه فایل‌ها فقط تابع تعریف می‌کنند و خودشان اجرا نمی‌شوند. این فایل است که
 * آن‌ها را به ترتیب صدا می‌زند.
 *
 * اگر خواستید بدانید صفحه از کجا شروع می‌شود، از همین‌جا شروع کنید.
 * ==========================================================================*/

function startApp() {
  /* ۱. تنظیمات ذخیره‌شده کاربر (مثل ترتیب مرتب‌سازی) */
  const prefs = readStore(STORAGE_KEYS.prefs, {});
  if (prefs.sort && SORT_OPTIONS.some((o) => o.id === prefs.sort)) {
    catalogState.sort = prefs.sort;
  }

  /* ۲. رفتار مشترک کشوها و مودال‌ها */
  setupLayers();

  /* ۳. هدر و ناوبری */
  startAnnouncements();
  renderMainNav();
  renderMobileNav();
  setupHeaderActions();
  setupStickyHeader();
  setupBackToTop();
  setupSmoothScroll();
  setupSearch('#search-input', '#search-results', '#search-clear');
  setupSearch('#mobile-search-input', '#mobile-search-results', null);

  /* ۴. بخش‌های صفحه */
  setupHeroArt();
  renderCategories();
  renderToolbar();
  renderCatalog();
  renderNewArrivals();
  renderOffer();
  startCountdown();
  renderBrands();
  renderRoutine();
  renderPosts();
  renderTrust();
  renderFooter();

  /* ۵. سبد خرید و علاقه‌مندی‌ها از حافظه مرورگر */
  renderCart();
  refreshWishlistUI();

  /* ۶. فرم‌ها */
  setupNewsletter();
}

/* صبر می‌کنیم تا مرورگر کل HTML را خوانده باشد، وگرنه عناصری که می‌خواهیم
   پر کنیم هنوز وجود ندارند. */
document.addEventListener('DOMContentLoaded', startApp);
