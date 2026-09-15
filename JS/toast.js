/* ============================================================================
 * toast.js — پیام‌های کوتاه گوشه صفحه
 * ----------------------------------------------------------------------------
 *   toast('به سبد اضافه شد');
 *   toast('موجودی کافی نیست', 'error');
 * ==========================================================================*/

const TOAST_LIFETIME = 3600;

const TOAST_ICONS = {
  success: 'check_circle',
  info: 'info',
  error: 'error',
};

function toast(message, type) {
  const host = find('#toasts');
  if (!host) return;

  const kind = TOAST_ICONS[type] ? type : 'success';
  const node = el('div', 'toast toast--' + kind);
  node.append(icon(TOAST_ICONS[kind]), el('span', 'toast__text', message));

  const close = el('button', 'toast__close');
  close.type = 'button';
  close.setAttribute('aria-label', 'بستن پیام');
  close.append(icon('close'));
  close.addEventListener('click', () => dismissToast(node));
  node.append(close);

  host.append(node);

  /* کلاس در فریم بعد اضافه می‌شود تا انیمیشن ورود اجرا شود. */
  requestAnimationFrame(() => node.classList.add('is-visible'));
  setTimeout(() => dismissToast(node), TOAST_LIFETIME);
}

function dismissToast(node) {
  if (!node.isConnected) return;
  node.classList.remove('is-visible');
  node.addEventListener('transitionend', () => node.remove(), { once: true });
  /* اگر انیمیشن‌ها خاموش باشند transitionend اجرا نمی‌شود. */
  setTimeout(() => node.remove(), 500);
}
