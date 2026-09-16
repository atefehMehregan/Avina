/* ============================================================================
 * hero-art.js — دو کار کوچک برای نشان متحرک قهرمان
 * ----------------------------------------------------------------------------
 * خود انیمیشن تماماً CSS است و بدون جاوااسکریپت هم کار می‌کند. این فایل فقط
 * دو چیز اضافه می‌کند که با CSS تنها ممکن نیست:
 *
 *   ۱. توقف چرخه‌ها وقتی نشان از دید خارج شده (مصرف باتری و CPU)
 *   ۲. پارالاکس بسیار ملایم با حرکت اشاره‌گر، فقط روی دستگاه‌های با ماوس
 *
 * اگر کاربر «کاهش حرکت» را روشن کرده باشد، هیچ‌کدام اجرا نمی‌شوند.
 * ==========================================================================*/

function setupHeroArt() {
  const art = find('#hero-art');
  if (!art) return;

  /* بخش قهرمان، محدوده‌ای که حرکت ماوس در آن را دنبال می‌کنیم */
  const zone = art.closest('.hero') || art;
  const lessMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hasMouse = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ۱. بیرون از دید، چرخه‌ها می‌ایستند --------------------------------- */
  if ('IntersectionObserver' in window) {
    const watcher = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          art.classList.toggle('is-idle', !entry.isIntersecting);
        });
      },
      { rootMargin: '150px' }
    );
    watcher.observe(art);
  }

  /* ۲. پارالاکس ملایم -------------------------------------------------- */
  /* مقدارها را در متغیرهای CSS می‌گذاریم و چیدن لایه‌ها با CSS انجام می‌شود. */
  let pendingFrame = 0;
  let x = 0;
  let y = 0;

  function paint() {
    pendingFrame = 0;
    art.style.setProperty('--av-mx', x.toFixed(3));
    art.style.setProperty('--av-my', y.toFixed(3));
  }

  /* در هر فریم فقط یک بار می‌نویسیم، نه در هر رویداد موس */
  function schedule() {
    if (!pendingFrame) pendingFrame = requestAnimationFrame(paint);
  }

  function onMove(event) {
    const box = art.getBoundingClientRect();
    if (!box.width || !box.height) return;
    /* موقعیت اشاره‌گر نسبت به مرکز نشان، بین ۱- و ۱ */
    x = clampUnit(((event.clientX - box.left) / box.width - 0.5) * 2);
    y = clampUnit(((event.clientY - box.top) / box.height - 0.5) * 2);
    schedule();
  }

  function onLeave() {
    x = 0;
    y = 0;
    schedule();
  }

  function clampUnit(value) {
    return Math.max(-1, Math.min(1, value));
  }

  /* با تغییر تنظیمات سیستم یا وصل‌شدن ماوس، دوباره تصمیم می‌گیریم */
  function sync() {
    const enabled = hasMouse.matches && !lessMotion.matches;

    zone.removeEventListener('pointermove', onMove);
    zone.removeEventListener('pointerleave', onLeave);

    if (enabled) {
      zone.addEventListener('pointermove', onMove, { passive: true });
      zone.addEventListener('pointerleave', onLeave);
    }

    art.classList.toggle('has-parallax', enabled);
    onLeave();
  }

  listenToMedia(lessMotion, sync);
  listenToMedia(hasMouse, sync);
  sync();
}

/** گوش دادن به تغییر یک media query، با پشتیبانی از مرورگرهای قدیمی‌تر. */
function listenToMedia(query, handler) {
  if (query.addEventListener) query.addEventListener('change', handler);
  else if (query.addListener) query.addListener(handler);
}
