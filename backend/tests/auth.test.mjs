/* ============================================================================
 * tests/auth.test.mjs — آزمون سرتاسری احراز هویت
 * ----------------------------------------------------------------------------
 * سرور باید از قبل در حال اجرا باشد:  npm start
 * اجرا:  node tests/auth.test.mjs
 *
 * کاربر آزمایشی با ایمیل تصادفی ساخته می‌شود تا اجرای دوباره تداخل نکند،
 * و هیچ اعتبارنامه واقعی اینجا نیست.
 * ==========================================================================*/
import crypto from 'node:crypto';

const BASE = process.env.API_BASE || 'http://127.0.0.1:4000';
const ORIGIN = 'http://localhost:8080';

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  -> ' + JSON.stringify(extra) : '')); }
}

/* یک ظرف کوکی ساده، چون fetch در Node کوکی را خودش نگه نمی‌دارد */
const jar = new Map();
function saveCookies(res) {
  for (const raw of res.headers.getSetCookie?.() || []) {
    const [pair] = raw.split(';');
    const i = pair.indexOf('=');
    const k = pair.slice(0, i).trim();
    const v = pair.slice(i + 1).trim();
    if (v === '' ) jar.delete(k); else jar.set(k, v);
  }
}
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function api(path, { method = 'GET', body, csrf, origin = ORIGIN } = {}) {
  const headers = { Origin: origin };
  if (body) headers['Content-Type'] = 'application/json';
  if (csrf) headers['X-CSRF-Token'] = csrf;
  const cookies = cookieHeader();
  if (cookies) headers.Cookie = cookies;

  const res = await fetch(BASE + path, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  saveCookies(res);
  let json = null;
  try { json = await res.json(); } catch { /* بدنه خالی */ }
  return { status: res.status, body: json, headers: res.headers };
}

const stamp = Date.now();
/* رمز آزمون در لحظه اجرا ساخته می‌شود تا هیچ اعتبارنامه‌ای در مخزن نماند. */
const testPassword = 'T' + crypto.randomUUID().replace(/-/g, '').slice(0, 14) + '9a';
const user = {
  first_name: 'مینا',
  last_name: 'رضایی',
  email: `test.${stamp}@example.com`,
  phone: '09' + String(120000000 + (stamp % 79999999)).slice(0, 9),
  password: testPassword,
  password_confirmation: testPassword,
};

function noSecretLeak(obj) {
  const s = JSON.stringify(obj || {});
  return !/password|hash|argon2|token_hash|csrf_hash/i.test(s);
}

console.log('\n=== ۱. اعتبارسنجی ورودی ===');
{
  const r = await api('/api/auth/register', { method: 'POST', body: {
    first_name: 'a', last_name: '', email: 'bad', phone: '123',
    password: 'short', password_confirmation: 'other' } });
  check('ثبت‌نام نامعتبر → 422', r.status === 422, r.body);
  check('همه فیلدها خطا دارند', Object.keys(r.body?.errors || {}).length === 6, r.body?.errors);
  check('پیام‌ها فارسی‌اند', /[؀-ۿ]/.test(r.body?.message || ''));
}

console.log('\n=== ۲. ثبت‌نام موفق ===');
let csrf = null;
{
  const r = await api('/api/auth/register', { method: 'POST', body: user });
  check('ثبت‌نام → 201', r.status === 201, r.body);
  check('کاربر برگشت داده شد', r.body?.user?.email === user.email, r.body?.user);
  check('هیچ رمز/هشی در پاسخ نیست', noSecretLeak(r.body), r.body);
  check('کوکی نشست HttpOnly است',
    (r.headers.getSetCookie?.() || []).some((c) => /avina_session=/.test(c) && /HttpOnly/i.test(c)));
  check('کوکی CSRF قابل خواندن است (HttpOnly نیست)',
    (r.headers.getSetCookie?.() || []).some((c) => /avina_csrf=/.test(c) && !/HttpOnly/i.test(c)));
  csrf = jar.get('avina_csrf');
  check('توکن CSRF دریافت شد', Boolean(csrf));
}

console.log('\n=== ۳. جلوگیری از حساب تکراری ===');
{
  const r = await api('/api/auth/register', { method: 'POST', body: user });
  check('ایمیل تکراری → 409', r.status === 409, r.body);
  check('پیام ایمیل تکراری فارسی است', /ایمیل/.test(r.body?.message || ''), r.body);

  const r2 = await api('/api/auth/register', { method: 'POST', body: {
    ...user, email: `other.${stamp}@example.com` } });
  check('موبایل تکراری → 409', r2.status === 409, r2.body);
  check('پیام موبایل تکراری فارسی است', /موبایل/.test(r2.body?.message || ''), r2.body);
}

console.log('\n=== ۴. نشست معتبر ===');
{
  const r = await api('/api/auth/me');
  check('/me با نشست → 200', r.status === 200, r.body);
  check('/me همان کاربر را می‌دهد', r.body?.user?.email === user.email);
  check('/me رمز لو نمی‌دهد', noSecretLeak(r.body), r.body);
}

console.log('\n=== ۵. CSRF ===');
{
  const r = await api('/api/auth/logout', { method: 'POST' });   // بدون هدر
  check('خروج بدون توکن CSRF → 403', r.status === 403, r.body);
  const r2 = await api('/api/auth/logout', { method: 'POST', csrf: 'wrong-token' });
  check('خروج با CSRF اشتباه → 403', r2.status === 403, r2.body);
}

console.log('\n=== ۶. خروج ===');
{
  const r = await api('/api/auth/logout', { method: 'POST', csrf });
  check('خروج با CSRF درست → 200', r.status === 200, r.body);
  const after = await api('/api/auth/me');
  check('/me بعد از خروج → 401', after.status === 401, after.body);
}

console.log('\n=== ۷. ورود ===');
{
  const bad = await api('/api/auth/login', { method: 'POST', body: {
    identifier: user.email, password: testPassword + 'x' } });
  check('رمز اشتباه → 401', bad.status === 401, bad.body);
  check('پیام مبهم است (نمی‌گوید کدام غلط است)',
    !/ایمیل یافت نشد|کاربر وجود ندارد/.test(bad.body?.message || ''), bad.body);

  const ok = await api('/api/auth/login', { method: 'POST', body: {
    identifier: user.email, password: user.password } });
  check('ورود درست → 200', ok.status === 200, ok.body);
  check('ورود رمز لو نمی‌دهد', noSecretLeak(ok.body), ok.body);
  csrf = jar.get('avina_csrf');

  const me = await api('/api/auth/me');
  check('نشست بعد از ورود برقرار است', me.status === 200 && me.body?.user?.email === user.email);
}

console.log('\n=== ۸. ورود با موبایل و ارقام فارسی ===');
{
  jar.clear();
  const persian = user.phone.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
  const r = await api('/api/auth/login', { method: 'POST', body: {
    identifier: persian, password: user.password } });
  check('ورود با موبایل فارسی → 200', r.status === 200, r.body);
  csrf = jar.get('avina_csrf');
}

console.log('\n=== ۹. دسترسی بدون احراز هویت ===');
{
  const saved = new Map(jar);
  jar.clear();
  const r = await api('/api/auth/me');
  check('/me بدون کوکی → 401', r.status === 401, r.body);
  const r2 = await api('/api/auth/me', { headers: { Cookie: 'avina_session=forged-token' } });
  check('توکن جعلی پذیرفته نمی‌شود', r2.status === 401, r2.body);
  for (const [k, v] of saved) jar.set(k, v);
}

console.log('\n=== ۱۰. CORS ===');
{
  const r = await fetch(BASE + '/api/health', { headers: { Origin: 'https://evil.example.com' } });
  check('مبدا غیرمجاز هدر CORS نمی‌گیرد', !r.headers.get('access-control-allow-origin'));
  const r2 = await fetch(BASE + '/api/health', { headers: { Origin: ORIGIN } });
  check('مبدا مجاز هدر دقیق می‌گیرد', r2.headers.get('access-control-allow-origin') === ORIGIN);
  check('هرگز * برنمی‌گرداند', r2.headers.get('access-control-allow-origin') !== '*');
  const pre = await fetch(BASE + '/api/auth/login', {
    method: 'OPTIONS', headers: { Origin: 'https://evil.example.com' } });
  check('preflight از مبدا غیرمجاز → 403', pre.status === 403);
}

console.log('\n=== ۱۱. محدودیت تلاش ورود ===');
{
  let blocked = false;
  for (let i = 0; i < 8; i++) {
    const r = await api('/api/auth/login', { method: 'POST', body: {
      identifier: user.email, password: 'DefinitelyWrong' + i } });
    if (r.status === 429) { blocked = true; break; }
  }
  check('بعد از چند تلاش ناموفق قفل می‌شود → 429', blocked);
}

console.log(`\n================  PASS ${pass}  /  FAIL ${fail}  ================\n`);
process.exit(fail === 0 ? 0 : 1);
