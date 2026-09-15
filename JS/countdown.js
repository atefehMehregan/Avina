/* ============================================================================
 * countdown.js — شمارش معکوس پیشنهاد ویژه
 * ----------------------------------------------------------------------------
 * زمان پایان از روی OFFER.hoursFromNow حساب می‌شود و در حافظه مرورگر می‌ماند،
 * تا با هر بار تازه‌سازی صفحه دوباره از اول شروع نشود.
 * ==========================================================================*/

const OFFER_KEY = 'avina.offerEnds';

/** زمان پایان پیشنهاد؛ اگر گذشته باشد یک دوره تازه شروع می‌شود. */
function offerDeadline() {
  const stored = Number(readStore(OFFER_KEY, 0));
  if (stored && stored > Date.now()) return stored;

  const next = Date.now() + OFFER.hoursFromNow * 60 * 60 * 1000;
  writeStore(OFFER_KEY, next);
  return next;
}

function startCountdown() {
  const host = find('#countdown');
  if (!host) return;

  const deadline = offerDeadline();

  const units = [
    { id: 'days', label: 'روز' },
    { id: 'hours', label: 'ساعت' },
    { id: 'minutes', label: 'دقیقه' },
    { id: 'seconds', label: 'ثانیه' },
  ];

  /* ساختار یک بار ساخته می‌شود؛ بعد فقط عددها عوض می‌شوند. */
  const values = {};
  fill(host, units.map((unit) => {
    const box = el('div', 'countdown__unit');
    const value = el('span', 'countdown__value num', '۰۰');
    values[unit.id] = value;
    box.append(value, el('span', 'countdown__label', unit.label));
    return box;
  }));

  function pad(n) {
    return fa(String(n).padStart(2, '0'));
  }

  function tick() {
    const remaining = Math.max(0, deadline - Date.now());
    const totalSeconds = Math.floor(remaining / 1000);

    values.days.textContent = pad(Math.floor(totalSeconds / 86400));
    values.hours.textContent = pad(Math.floor(totalSeconds / 3600) % 24);
    values.minutes.textContent = pad(Math.floor(totalSeconds / 60) % 60);
    values.seconds.textContent = pad(totalSeconds % 60);
  }

  tick();
  setInterval(tick, 1000);
}
