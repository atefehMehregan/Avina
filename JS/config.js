/* ============================================================================
 * config.js — تنظیمات وابسته به محل استقرار
 * ----------------------------------------------------------------------------
 * آدرس API فقط همین‌جا تعریف می‌شود. هیچ جای دیگری از کد آدرس سرور را
 * مستقیم ننویسید؛ با عوض شدن میزبان فقط این فایل (یا مقدار تزریق‌شده)
 * تغییر می‌کند.
 *
 * سه راه برای تعیین آدرس، به ترتیب اولویت:
 *   ۱. window.AVINA_CONFIG.apiBaseUrl  — مثلا با یک <script> در زمان استقرار
 *   ۲. <meta name="avina-api-base" content="https://api.example.com">
 *   ۳. پیش‌فرض بر پایه دامنه فعلی (پایین)
 *
 * اینجا هیچ راز و کلیدی نیست و نباید باشد؛ این فایل عمومی است.
 * ==========================================================================*/

function detectApiBase() {
  /* ۱. تنظیم تزریق‌شده */
  if (window.AVINA_CONFIG && window.AVINA_CONFIG.apiBaseUrl) {
    return String(window.AVINA_CONFIG.apiBaseUrl).replace(/\/+$/, '');
  }

  /* ۲. تگ meta در <head> */
  const meta = document.querySelector('meta[name="avina-api-base"]');
  if (meta && meta.content && meta.content.trim()) {
    return meta.content.trim().replace(/\/+$/, '');
  }

  /* ۳. پیش‌فرض: روی ماشین خودتان به سرور محلی وصل شو.
     عمدا همان hostname صفحه استفاده می‌شود (نه 127.0.0.1 ثابت): مرورگر
     localhost و 127.0.0.1 را دو سایت جدا می‌بیند و کوکی نشست بین‌شان
     فرستاده نمی‌شود. پورت فرق می‌کند ولی «سایت» یکی می‌ماند. */
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://' + host + ':4000';
  }

  /* روی GitHub Pages هنوز سروری تعیین نشده است. رشته خالی یعنی
     «حساب کاربری فعلا در دسترس نیست» و رابط کاربری همین را می‌گوید. */
  return '';
}

const AVINA_API_BASE = detectApiBase();

/** آیا سرویس حساب کاربری پیکربندی شده است؟ */
function isAuthConfigured() {
  return Boolean(AVINA_API_BASE);
}
