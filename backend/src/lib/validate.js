/* ============================================================================
 * validate.js — اعتبارسنجی سمت سرور
 * ----------------------------------------------------------------------------
 * هرچه سمت مرورگر بررسی شده، اینجا دوباره بررسی می‌شود. مرورگر قابل اعتماد
 * نیست؛ کسی می‌تواند مستقیم به API درخواست بزند.
 * ==========================================================================*/

/* ارقام فارسی و عربی به انگلیسی، تا «۰۹۱۲...» هم پذیرفته شود */
const DIGIT_MAP = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

export function toEnglishDigits(value) {
  return String(value ?? '').replace(/[۰-۹٠-٩]/g, (d) => DIGIT_MAP[d] || d);
}

/**
 * حذف نویسه‌های کنترلی (کد کمتر از ۳۲ و نیز DEL).
 * با کد نویسه کار می‌کنیم نه الگوی متنی، تا خود این فایل نویسه کنترلی نداشته باشد.
 */
function stripControl(text) {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code < 0x20 || code === 0x7f) continue;
    out += ch;
  }
  return out;
}

export function cleanText(value, max = 200) {
  return stripControl(String(value ?? '')).trim().slice(0, max);
}

export function normalizeEmail(value) {
  return cleanText(value, 254).toLowerCase();
}

/** موبایل ایران را به شکل 09xxxxxxxxx در می‌آورد؛ نامعتبر باشد null. */
export function normalizePhone(value) {
  let v = stripControl(toEnglishDigits(value)).replace(/[\s()-]/g, '');
  if (v.startsWith('+98')) v = '0' + v.slice(3);
  else if (v.startsWith('0098')) v = '0' + v.slice(4);
  else if (v.startsWith('98') && v.length === 12) v = '0' + v.slice(2);
  else if (/^9\d{9}$/.test(v)) v = '0' + v;
  return /^09\d{9}$/.test(v) ? v : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/**
 * بررسی ورودی ثبت‌نام.
 * @returns {{ok:true,value:object} | {ok:false,errors:object}}
 */
export function validateRegistration(body) {
  const errors = {};
  const first = cleanText(body?.first_name, 60);
  const last = cleanText(body?.last_name, 60);
  const email = normalizeEmail(body?.email);
  const phone = normalizePhone(body?.phone);
  const password = String(body?.password ?? '');
  const confirm = String(body?.password_confirmation ?? '');

  if (first.length < 2) errors.first_name = 'نام را وارد کنید (دست‌کم ۲ نویسه).';
  if (last.length < 2) errors.last_name = 'نام خانوادگی را وارد کنید (دست‌کم ۲ نویسه).';
  if (!email) errors.email = 'ایمیل را وارد کنید.';
  else if (!EMAIL_RE.test(email) || email.length > 254) errors.email = 'قالب ایمیل درست نیست.';
  if (!phone) errors.phone = 'شماره موبایل باید مثل ۰۹۱۲۳۴۵۶۷۸۹ باشد.';

  if (password.length < 8) errors.password = 'رمز باید دست‌کم ۸ نویسه باشد.';
  else if (password.length > 200) errors.password = 'رمز بیش از حد بلند است.';
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = 'رمز باید هم حرف و هم رقم داشته باشد.';
  }
  if (password !== confirm) errors.password_confirmation = 'تکرار رمز با رمز یکی نیست.';

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { first, last, email, phone, password } };
}

/** ورود: شناسه می‌تواند ایمیل یا موبایل باشد. */
export function validateLogin(body) {
  const errors = {};
  const raw = cleanText(body?.identifier, 254);
  const password = String(body?.password ?? '');

  if (!raw) errors.identifier = 'ایمیل یا شماره موبایل را وارد کنید.';
  if (!password) errors.password = 'رمز را وارد کنید.';
  if (Object.keys(errors).length) return { ok: false, errors };

  const phone = normalizePhone(raw);
  return {
    ok: true,
    value: { identifier: phone || normalizeEmail(raw), isPhone: Boolean(phone), password },
  };
}
