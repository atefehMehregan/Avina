/* ============================================================================
 * auth.js — حساب کاربری آوینا
 * ----------------------------------------------------------------------------
 * این فایل با API واقعی حرف می‌زند؛ هیچ حسابی در مرورگر ساخته یا ذخیره
 * نمی‌شود. رمز فقط یک بار در بدنه درخواست به سرور می‌رود و هیچ‌جا نگه
 * داشته نمی‌شود — نه در localStorage، نه در متغیر سراسری.
 *
 * نشست با کوکی HttpOnly نگه داشته می‌شود، پس جاوااسکریپت اصلا به آن دسترسی
 * ندارد (در برابر XSS مقاوم‌تر است). تنها چیزی که می‌خوانیم توکن CSRF است
 * که عمدا خواندنی است و باید در هدر برگردانده شود.
 * ==========================================================================*/

const authState = {
  user: null,      // اطلاعات عمومی کاربر یا null
  ready: false,    // آیا یک بار از سرور پرسیده‌ایم؟
};

/* ------------------------------------------------------------ گفتگو با API */

function csrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)avina_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

/**
 * یک درخواست به API.
 * credentials: 'include' لازم است وگرنه کوکی نشست بین دامنه‌ها فرستاده نمی‌شود.
 * @returns {Promise<{status:number, body:object}>}
 */
async function apiRequest(path, options) {
  const settings = options || {};
  const headers = {};
  if (settings.body) headers['Content-Type'] = 'application/json';

  /* توکن CSRF فقط برای درخواست‌های تغییردهنده لازم است. */
  const method = settings.method || 'GET';
  if (method !== 'GET') {
    const token = csrfToken();
    if (token) headers['X-CSRF-Token'] = token;
  }

  const response = await fetch(AVINA_API_BASE + path, {
    method,
    headers,
    credentials: 'include',
    body: settings.body ? JSON.stringify(settings.body) : undefined,
  });

  let body = null;
  try {
    body = await response.json();
  } catch (error) {
    /* پاسخ بدون بدنه یا خراب — با body خالی ادامه می‌دهیم. */
  }
  return { status: response.status, body: body || {} };
}

/* --------------------------------------------------------- وضعیت ورود */

/** پرسیدن «الان چه کسی وارد است؟» از سرور. */
async function refreshAuthState() {
  if (!isAuthConfigured()) {
    authState.ready = true;
    return null;
  }
  try {
    const result = await apiRequest('/api/auth/me');
    authState.user = result.status === 200 && result.body.user ? result.body.user : null;
  } catch (error) {
    authState.user = null;   // سرور در دسترس نیست
  }
  authState.ready = true;
  renderAccountButton();
  return authState.user;
}

/* ------------------------------------------------------- دکمه حساب در هدر */

function renderAccountButton() {
  const button = find('#account-button');
  if (!button) return;

  const user = authState.user;
  const label = user ? user.first_name : 'حساب کاربری';
  button.setAttribute('aria-label', user ? 'حساب کاربری ' + user.first_name : 'ورود یا ثبت‌نام');
  button.classList.toggle('is-authed', Boolean(user));

  /* textContent استفاده می‌شود، نه innerHTML: نام کاربر داده بیرونی است. */
  fill(button, [icon(user ? 'person_check' : 'person')]);
  if (user) {
    const name = el('span', 'icon-btn__name', label);
    button.append(name);
  }
}

/* ------------------------------------------------------------ فرم‌ها */

const FIELD_LABELS = {
  first_name: 'نام',
  last_name: 'نام خانوادگی',
  email: 'ایمیل',
  phone: 'شماره موبایل',
  password: 'رمز عبور',
  password_confirmation: 'تکرار رمز عبور',
  identifier: 'ایمیل یا موبایل',
};

/** ساخت یک فیلد فرم با برچسب و جای پیام خطا. */
function authField(name, type, autocomplete, extra) {
  const wrap = el('div', 'auth-field');
  const id = 'auth-' + name;

  const label = el('label', 'auth-field__label', FIELD_LABELS[name] || name);
  label.setAttribute('for', id);

  const input = el('input', 'newsletter__input auth-field__input');
  input.id = id;
  input.name = name;
  input.type = type;
  if (autocomplete) input.autocomplete = autocomplete;
  if (extra && extra.inputmode) input.inputMode = extra.inputmode;
  if (extra && extra.placeholder) input.placeholder = extra.placeholder;
  input.setAttribute('aria-describedby', id + '-error');

  const error = el('span', 'form-error');
  error.id = id + '-error';

  wrap.append(label, input, error);
  return wrap;
}

function showFieldErrors(form, errors) {
  findAll('.auth-field__input', form).forEach((input) => {
    input.classList.remove('has-error');
    input.setAttribute('aria-invalid', 'false');
    const slot = find('#' + input.id + '-error', form);
    if (slot) slot.textContent = '';
  });
  if (!errors) return;

  Object.keys(errors).forEach((name) => {
    const input = find('[name="' + name + '"]', form);
    if (!input) return;
    input.classList.add('has-error');
    input.setAttribute('aria-invalid', 'true');
    const slot = find('#' + input.id + '-error', form);
    if (slot) slot.textContent = errors[name];
  });

  const first = find('.auth-field__input.has-error', form);
  if (first) first.focus();
}

function setFormBusy(form, busy, busyText) {
  const button = find('button[type="submit"]', form);
  if (!button) return;
  button.disabled = busy;
  if (busy) {
    button.dataset.idleText = button.textContent;
    button.textContent = busyText;
  } else if (button.dataset.idleText) {
    button.textContent = button.dataset.idleText;
  }
}

/* ------------------------------------------------- اعتبارسنجی سمت مرورگر */
/* همین بررسی‌ها سمت سرور هم انجام می‌شود؛ اینجا فقط برای پاسخ سریع‌تر است. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function toEnglishDigits(value) {
  return String(value).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

function normalizePhoneLocal(value) {
  let v = toEnglishDigits(value).replace(/[\s()-]/g, '');
  if (v.indexOf('+98') === 0) v = '0' + v.slice(3);
  else if (v.indexOf('0098') === 0) v = '0' + v.slice(4);
  else if (/^9\d{9}$/.test(v)) v = '0' + v;
  return /^09\d{9}$/.test(v) ? v : null;
}

function validateRegisterForm(values) {
  const errors = {};
  if (values.first_name.length < 2) errors.first_name = 'نام را وارد کنید.';
  if (values.last_name.length < 2) errors.last_name = 'نام خانوادگی را وارد کنید.';
  if (!values.email) errors.email = 'ایمیل را وارد کنید.';
  else if (!EMAIL_RE.test(values.email)) errors.email = 'قالب ایمیل درست نیست. نمونه: name@mail.com';
  if (!values.phone) errors.phone = 'شماره موبایل را وارد کنید.';
  else if (!normalizePhoneLocal(values.phone)) errors.phone = 'شماره موبایل باید مثل ۰۹۱۲۳۴۵۶۷۸۹ باشد.';
  if (values.password.length < 8) errors.password = 'رمز باید دست‌کم ۸ نویسه باشد.';
  else if (!/[A-Za-z]/.test(values.password) || !/\d/.test(values.password)) {
    errors.password = 'رمز باید هم حرف و هم رقم داشته باشد.';
  }
  if (values.password !== values.password_confirmation) {
    errors.password_confirmation = 'تکرار رمز با رمز یکی نیست.';
  }
  return errors;
}

/* ------------------------------------------------------------ پنجره حساب */

function readForm(form) {
  const values = {};
  findAll('.auth-field__input', form).forEach((input) => {
    values[input.name] = input.value.trim();
  });
  return values;
}

/** پیام خطای شبکه — وقتی اصلا به سرور نرسیدیم. */
function networkMessage() {
  return 'ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.';
}

function buildLoginForm() {
  const form = el('form', 'auth-form');
  form.noValidate = true;
  form.append(
    authField('identifier', 'text', 'username', { placeholder: 'ایمیل یا ۰۹۱۲۳۴۵۶۷۸۹' }),
    authField('password', 'password', 'current-password')
  );
  const submit = el('button', 'btn btn--primary btn--block', 'ورود به حساب');
  submit.type = 'submit';
  form.append(submit);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = readForm(form);
    const errors = {};
    if (!values.identifier) errors.identifier = 'ایمیل یا شماره موبایل را وارد کنید.';
    if (!values.password) errors.password = 'رمز را وارد کنید.';
    if (Object.keys(errors).length) return showFieldErrors(form, errors);

    showFieldErrors(form, null);
    setFormBusy(form, true, 'در حال ورود...');
    try {
      const result = await apiRequest('/api/auth/login', { method: 'POST', body: values });
      if (result.status === 200) {
        authState.user = result.body.user;
        renderAccountButton();
        closeLayer();
        toast(result.body.message || 'خوش آمدید!', 'success');
        return;
      }
      if (result.body.errors) showFieldErrors(form, result.body.errors);
      toast(result.body.message || 'ورود انجام نشد.', 'error');
    } catch (error) {
      toast(networkMessage(), 'error');
    } finally {
      setFormBusy(form, false);
    }
  });

  return form;
}

function buildRegisterForm() {
  const form = el('form', 'auth-form');
  form.noValidate = true;

  const row = el('div', 'auth-form__row');
  row.append(authField('first_name', 'text', 'given-name'),
             authField('last_name', 'text', 'family-name'));

  form.append(
    row,
    authField('email', 'email', 'email', { placeholder: 'name@mail.com' }),
    authField('phone', 'tel', 'tel', { inputmode: 'numeric', placeholder: '۰۹۱۲۳۴۵۶۷۸۹' }),
    authField('password', 'password', 'new-password', { placeholder: 'دست‌کم ۸ نویسه، حرف و رقم' }),
    authField('password_confirmation', 'password', 'new-password')
  );

  const submit = el('button', 'btn btn--primary btn--block', 'ساخت حساب');
  submit.type = 'submit';
  form.append(submit);

  const note = el('p', 'auth-note',
    'رمز شما به شکل رمزنگاری‌شده روی سرور نگه داشته می‌شود و هرگز در مرورگر ذخیره نمی‌شود.');
  form.append(note);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = readForm(form);
    const errors = validateRegisterForm(values);
    if (Object.keys(errors).length) return showFieldErrors(form, errors);

    showFieldErrors(form, null);
    setFormBusy(form, true, 'در حال ساخت حساب...');
    try {
      const result = await apiRequest('/api/auth/register', { method: 'POST', body: values });
      if (result.status === 201) {
        authState.user = result.body.user;
        renderAccountButton();
        closeLayer();
        toast(result.body.message || 'حساب شما ساخته شد.', 'success');
        return;
      }
      if (result.body.errors) showFieldErrors(form, result.body.errors);
      toast(result.body.message || 'ثبت‌نام انجام نشد.', 'error');
    } catch (error) {
      toast(networkMessage(), 'error');
    } finally {
      setFormBusy(form, false);
    }
  });

  return form;
}

/** نمای «وارد شده‌اید» با دکمه خروج. */
function buildAccountPanel() {
  const user = authState.user;
  const box = el('div', 'auth-panel');

  box.append(el('p', 'auth-panel__hello', 'سلام ' + user.first_name + '!'));

  const list = el('dl', 'auth-panel__list');
  [['نام', user.first_name + ' ' + user.last_name],
   ['ایمیل', user.email],
   ['موبایل', user.phone]].forEach((pair) => {
    list.append(el('dt', null, pair[0]), el('dd', null, pair[1]));
  });
  box.append(list);

  box.append(el('p', 'auth-note',
    'بخش سفارش‌ها و آدرس‌ها در مرحله بعد اضافه می‌شود.'));

  const out = el('button', 'btn btn--ghost btn--block', 'خروج از حساب');
  out.type = 'button';
  out.addEventListener('click', async () => {
    out.disabled = true;
    try {
      const result = await apiRequest('/api/auth/logout', { method: 'POST' });
      authState.user = null;
      renderAccountButton();
      closeLayer();
      toast(result.body.message || 'از حساب خارج شدید.', 'success');
    } catch (error) {
      toast(networkMessage(), 'error');
    } finally {
      out.disabled = false;
    }
  });
  box.append(out);

  return box;
}

/** ساخت محتوای پنجره و باز کردن آن. */
function openAuthModal(tab) {
  const modal = find('#auth-modal');
  const body = find('#auth-body');
  const title = find('#auth-title');
  if (!modal || !body) return;

  if (!isAuthConfigured()) {
    title.textContent = 'حساب کاربری';
    fill(body, [
      el('p', 'auth-note',
        'سرویس حساب کاربری هنوز روی این نسخه پیکربندی نشده است. ' +
        'نسخه آزمایشی روی رایانه خودتان کار می‌کند؛ راهنمای راه‌اندازی در backend/README.md است.'),
    ]);
    openLayer(modal, true);
    return;
  }

  /* وارد شده: پنل حساب. وارد نشده: ورود/ثبت‌نام. */
  if (authState.user) {
    title.textContent = 'حساب کاربری';
    fill(body, [buildAccountPanel()]);
    openLayer(modal, true);
    return;
  }

  title.textContent = 'ورود یا ثبت‌نام';

  const tabs = el('div', 'auth-tabs');
  const loginTab = el('button', 'auth-tabs__item', 'ورود');
  const registerTab = el('button', 'auth-tabs__item', 'ثبت‌نام');
  [loginTab, registerTab].forEach((b) => { b.type = 'button'; });
  tabs.append(loginTab, registerTab);

  const slot = el('div', 'auth-slot');

  function select(which) {
    const isLogin = which === 'login';
    loginTab.classList.toggle('is-active', isLogin);
    registerTab.classList.toggle('is-active', !isLogin);
    loginTab.setAttribute('aria-selected', String(isLogin));
    registerTab.setAttribute('aria-selected', String(!isLogin));
    fill(slot, [isLogin ? buildLoginForm() : buildRegisterForm()]);
  }

  loginTab.addEventListener('click', () => select('login'));
  registerTab.addEventListener('click', () => select('register'));

  fill(body, [tabs, slot]);
  select(tab === 'register' ? 'register' : 'login');
  openLayer(modal, true);
}

/* ------------------------------------------------------------ راه‌اندازی */

function setupAuth() {
  const button = find('#account-button');
  if (button) {
    button.addEventListener('click', () => openAuthModal('login'));
  }
  renderAccountButton();

  /* وضعیت ورود را از سرور می‌پرسیم — نشست ممکن است از بازدید قبلی مانده باشد. */
  refreshAuthState();
}
