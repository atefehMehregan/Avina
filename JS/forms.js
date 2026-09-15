/* ============================================================================
 * forms.js — اعتبارسنجی فرم خبرنامه
 * ----------------------------------------------------------------------------
 * این فایل فقط بررسی می‌کند چیزی که کاربر نوشته معتبر است یا نه. ثبت واقعی
 * ایمیل به سرور نیاز دارد و اینجا شبیه‌سازی نمی‌شود — README را ببینید.
 * ==========================================================================*/

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function setupNewsletter() {
  const form = find('#newsletter-form');
  const input = find('#newsletter-email');
  const error = find('#newsletter-error');
  if (!form || !input || !error) return;

  function showError(message) {
    error.textContent = message;
    input.classList.toggle('has-error', Boolean(message));
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  /* پیام خطا به‌محض شروع اصلاح پاک می‌شود. */
  input.addEventListener('input', () => {
    if (input.classList.contains('has-error')) showError('');
  });

  input.addEventListener('blur', () => {
    const value = input.value.trim();
    if (value && !EMAIL_PATTERN.test(value)) showError('نشانی ایمیل معتبر نیست.');
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const value = input.value.trim();

    if (!value) {
      showError('لطفا نشانی ایمیل خود را وارد کنید.');
      input.focus();
      return;
    }
    if (!EMAIL_PATTERN.test(value)) {
      showError('نشانی ایمیل معتبر نیست. نمونه: name@mail.com');
      input.focus();
      return;
    }

    showError('');
    form.reset();
    toast('ایمیل شما معتبر است؛ ثبت نهایی به سرور نیاز دارد.', 'info');
  });
}
