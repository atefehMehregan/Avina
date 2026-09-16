/* ============================================================================
 * tests/auth.test.mjs — آزمون سرتاسری احراز هویت روی PostgreSQL
 * ----------------------------------------------------------------------------
 * آزمون سرور را خودش بالا می‌آورد و به یک پایگاه داده‌ی جداگانه وصل می‌شود.
 *
 * پایگاه داده‌ی آزمون:
 *   * پیش‌فرض: PGlite در یک پوشه موقت — واقعا PostgreSQL است (WASM)، ولی
 *     کاملا جدا از هر چیز دیگری. چیزی نصب نمی‌خواهد.
 *   * اگر TEST_DATABASE_URL بدهید، روی همان اجرا می‌شود. هرگز DATABASE_URL
 *     تولید را برنمی‌دارد؛ باید صریح TEST_DATABASE_URL بدهید.
 *
 * هیچ اعتبارنامه‌ای اینجا ثابت نیست؛ رمز و ایمیل در لحظه ساخته می‌شوند.
 * ==========================================================================*/
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/* ---------------------------------------------- پیکربندی محیط آزمون ------ */
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'avina-test-'));
process.env.NODE_ENV = 'test';
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.DATABASE_DRIVER = 'pg';
} else {
  delete process.env.DATABASE_URL;         // مبادا به پایگاه داده واقعی بخورد
  process.env.DATABASE_DRIVER = 'pglite';
  process.env.PGLITE_DIR = testDir;        // روی دیسک، تا آزمون «راه‌اندازی دوباره» ممکن شود
}
const PORT = Number(process.env.TEST_PORT || 4399);
process.env.PORT = String(PORT);
const ORIGIN = 'http://localhost:8080';
process.env.ALLOWED_ORIGINS = `https://atefehmehregan.github.io,${ORIGIN}`;

const BASE = `http://127.0.0.1:${PORT}`;

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); }
}

/* ظرف کوکی ساده، چون fetch در Node کوکی را نگه نمی‌دارد */
const jar = new Map();
function saveCookies(res) {
  for (const raw of res.headers.getSetCookie?.() || []) {
    const [pair] = raw.split(';');
    const i = pair.indexOf('=');
    const k = pair.slice(0, i).trim();
    const v = pair.slice(i + 1).trim();
    if (v === '') jar.delete(k); else jar.set(k, v);
  }
}
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}
async function api(pathname, { method = 'GET', body, csrf, origin = ORIGIN, cookie } = {}) {
  const headers = { Origin: origin };
  if (body) headers['Content-Type'] = 'application/json';
  if (csrf) headers['X-CSRF-Token'] = csrf;
  const cookies = cookie !== undefined ? cookie : cookieHeader();
  if (cookies) headers.Cookie = cookies;
  const res = await fetch(BASE + pathname, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  saveCookies(res);
  let json = null;
  try { json = await res.json(); } catch { /* بدنه خالی */ }
  return { status: res.status, body: json, headers: res.headers };
}

function noSecretLeak(obj) {
  const s = JSON.stringify(obj || {});
  return !/password|hash|argon2|token_hash|csrf_hash/i.test(s);
}

/* -------------------------------------------------- راه‌اندازی سرور ------ */
const { start } = await import('../src/server.js');
const { query, closeDb, connect, applySchema, currentDriver } = await import('../src/db/index.js');
let server = await start();

const stamp = Date.now();
const testPassword = 'T' + crypto.randomUUID().replace(/-/g, '').slice(0, 14) + '9a';
const user = {
  first_name: 'مینا',
  last_name: 'رضایی',
  email: `test.${stamp}@example.com`,
  phone: '09' + String(120000000 + (stamp % 79999999)).slice(0, 9),
  password: testPassword,
  password_confirmation: testPassword,
};

console.log(`\n=== ۰. راه‌اندازی پایگاه داده (راننده ${currentDriver()}) ===`);
{
  const tables = await query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' ORDER BY table_name`
  );
  const names = tables.rows.map((r) => r.table_name);
  check('هر هفت جدول ساخته شد',
    ['addresses', 'login_attempts', 'order_items', 'orders', 'payments', 'sessions', 'users']
      .every((t) => names.includes(t)), names);

  await applySchema();   // بار دوم
  await applySchema();   // بار سوم
  const again = await query(
    "SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema='public'"
  );
  check('اجرای دوباره schema بی‌خطر است (idempotent)', again.rows[0].n === names.length, again.rows[0]);

  const cols = await query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_name='users' ORDER BY column_name`
  );
  const byName = Object.fromEntries(cols.rows.map((r) => [r.column_name, r.data_type]));
  check('شناسه UUID است', byName.id === 'uuid', byName.id);
  check('is_active بولی است (در SQLite عدد بود)', byName.is_active === 'boolean', byName.is_active);
  check('created_at از نوع timestamptz است', byName.created_at.startsWith('timestamp with'), byName.created_at);

  const money = await query(
    `SELECT data_type FROM information_schema.columns
     WHERE table_name='orders' AND column_name='total_toman'`
  );
  check('مبلغ صحیح است، نه اعشار شناور', money.rows[0].data_type === 'bigint', money.rows[0]);
}

console.log('\n=== ۱. سلامت سرویس ===');
{
  const r = await api('/api/health');
  check('/api/health → 200', r.status === 200, r.body);
  check('پاسخ سلامت درست است', r.body?.ok === true && r.body?.service === 'avina-api', r.body);
}

console.log('\n=== ۲. اعتبارسنجی ورودی ===');
{
  const r = await api('/api/auth/register', { method: 'POST', body: {
    first_name: 'a', last_name: '', email: 'bad', phone: '123',
    password: 'short', password_confirmation: 'other' } });
  check('ثبت‌نام نامعتبر → 422', r.status === 422, r.body);
  check('همه فیلدها خطا دارند', Object.keys(r.body?.errors || {}).length === 6, r.body?.errors);
  check('پیام‌ها فارسی‌اند', /[؀-ۿ]/.test(r.body?.message || ''));
}

console.log('\n=== ۳. ثبت‌نام موفق ===');
let csrf = null;
{
  const r = await api('/api/auth/register', { method: 'POST', body: user });
  check('ثبت‌نام → 201', r.status === 201, r.body);
  check('کاربر برگشت داده شد', r.body?.user?.email === user.email, r.body?.user);
  check('هیچ رمز/هشی در پاسخ نیست', noSecretLeak(r.body), r.body);
  check('کوکی نشست HttpOnly است',
    (r.headers.getSetCookie?.() || []).some((c) => /avina_session=/.test(c) && /HttpOnly/i.test(c)));
  check('کوکی CSRF قابل خواندن است',
    (r.headers.getSetCookie?.() || []).some((c) => /avina_csrf=/.test(c) && !/HttpOnly/i.test(c)));
  csrf = jar.get('avina_csrf');
  check('توکن CSRF دریافت شد', Boolean(csrf));
}

console.log('\n=== ۴. رمز فقط به شکل هش Argon2id ذخیره می‌شود ===');
{
  const row = await query('SELECT password_hash, is_active FROM users WHERE email = $1', [user.email]);
  const hash = row.rows[0].password_hash;
  check('هش با $argon2id شروع می‌شود', hash.startsWith('$argon2id$'), hash.slice(0, 20));
  check('متن رمز در دیتابیس نیست', !hash.includes(testPassword));
  check('is_active مقدار بولی واقعی دارد', row.rows[0].is_active === true, row.rows[0].is_active);
}

console.log('\n=== ۵. توکن نشست فقط به شکل SHA-256 ذخیره می‌شود ===');
{
  const token = jar.get('avina_session');
  const rows = await query('SELECT token_hash, csrf_hash, expires_at FROM sessions');
  check('نشست ساخته شد', rows.rows.length >= 1);
  check('خود توکن در جدول نیست', !rows.rows.some((r) => r.token_hash === token));
  check('هش ۶۴ نویسه‌ای SHA-256 است', /^[0-9a-f]{64}$/.test(rows.rows[0].token_hash));
  check('تاریخ انقضا در آینده است', new Date(rows.rows[0].expires_at) > new Date());
}

console.log('\n=== ۶. جلوگیری از حساب تکراری ===');
{
  const r = await api('/api/auth/register', { method: 'POST', body: user });
  check('ایمیل تکراری → 409', r.status === 409, r.body);
  check('پیام ایمیل تکراری فارسی است', /ایمیل/.test(r.body?.message || ''), r.body);

  const r2 = await api('/api/auth/register', { method: 'POST', body: {
    ...user, email: `other.${stamp}@example.com` } });
  check('موبایل تکراری → 409', r2.status === 409, r2.body);
  check('پیام موبایل تکراری فارسی است', /موبایل/.test(r2.body?.message || ''), r2.body);
}

console.log('\n=== ۷. نشست معتبر ===');
{
  const r = await api('/api/auth/me');
  check('/me با نشست → 200', r.status === 200, r.body);
  check('/me همان کاربر را می‌دهد', r.body?.user?.email === user.email);
  check('/me رمز لو نمی‌دهد', noSecretLeak(r.body), r.body);
}

console.log('\n=== ۸. CSRF ===');
{
  const r = await api('/api/auth/logout', { method: 'POST' });
  check('خروج بدون توکن CSRF → 403', r.status === 403, r.body);
  const r2 = await api('/api/auth/logout', { method: 'POST', csrf: 'wrong-token' });
  check('خروج با CSRF اشتباه → 403', r2.status === 403, r2.body);
}

console.log('\n=== ۹. خروج ===');
{
  const r = await api('/api/auth/logout', { method: 'POST', csrf });
  check('خروج با CSRF درست → 200', r.status === 200, r.body);
  const after = await api('/api/auth/me');
  check('/me بعد از خروج → 401', after.status === 401, after.body);

  const revoked = await query('SELECT revoked_at FROM sessions WHERE revoked_at IS NOT NULL');
  check('نشست در دیتابیس باطل شد', revoked.rows.length >= 1);
}

console.log('\n=== ۱۰. ورود ===');
{
  const bad = await api('/api/auth/login', { method: 'POST', body: {
    identifier: user.email, password: testPassword + 'x' } });
  check('رمز اشتباه → 401', bad.status === 401, bad.body);
  check('پیام مبهم است', !/یافت نشد|وجود ندارد/.test(bad.body?.message || ''), bad.body);

  const ok = await api('/api/auth/login', { method: 'POST', body: {
    identifier: user.email, password: user.password } });
  check('ورود درست → 200', ok.status === 200, ok.body);
  check('ورود رمز لو نمی‌دهد', noSecretLeak(ok.body), ok.body);
  csrf = jar.get('avina_csrf');

  const me = await api('/api/auth/me');
  check('نشست بعد از ورود برقرار است', me.status === 200 && me.body?.user?.email === user.email);
}

console.log('\n=== ۱۱. ورود با موبایل و ارقام فارسی ===');
{
  const saved = new Map(jar);
  jar.clear();
  const persian = user.phone.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
  const r = await api('/api/auth/login', { method: 'POST', body: {
    identifier: persian, password: user.password } });
  check('ورود با موبایل فارسی → 200', r.status === 200, r.body);
  for (const [k, v] of saved) jar.set(k, v);
}

console.log('\n=== ۱۲. خروج از همه دستگاه‌ها ===');
{
  /* یک نشست دوم (دستگاه دیگر) می‌سازیم */
  const second = new Map();
  const res = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: user.email, password: user.password }),
  });
  for (const raw of res.headers.getSetCookie?.() || []) {
    const [pair] = raw.split(';');
    second.set(pair.slice(0, pair.indexOf('=')).trim(), pair.slice(pair.indexOf('=') + 1).trim());
  }
  const secondCookie = [...second.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  const secondCsrf = second.get('avina_csrf');

  const before = await api('/api/auth/me', { cookie: secondCookie });
  check('نشست دوم معتبر است', before.status === 200, before.body);

  /* از نشست اول «خروج از همه» می‌زنیم */
  const out = await api('/api/auth/logout-all', { method: 'POST', csrf });
  check('خروج از همه → 200', out.status === 200, out.body);

  const after1 = await api('/api/auth/me');
  const after2 = await api('/api/auth/me', { cookie: secondCookie });
  check('نشست اول باطل شد', after1.status === 401, after1.body);
  check('نشست دوم هم باطل شد', after2.status === 401, after2.body);
  void secondCsrf;
}

console.log('\n=== ۱۳. دسترسی بدون احراز هویت ===');
{
  jar.clear();
  const r = await api('/api/auth/me', { cookie: '' });
  check('/me بدون کوکی → 401', r.status === 401, r.body);
  const r2 = await api('/api/auth/me', { cookie: 'avina_session=forged-token' });
  check('توکن جعلی پذیرفته نمی‌شود', r2.status === 401, r2.body);
}

console.log('\n=== ۱۴. CORS ===');
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

console.log('\n=== ۱۵. محدودیت تلاش ورود ===');
{
  let blocked = false;
  for (let i = 0; i < 8; i++) {
    const r = await api('/api/auth/login', { method: 'POST', body: {
      identifier: user.email, password: 'DefinitelyWrong' + i }, cookie: '' });
    if (r.status === 429) { blocked = true; break; }
  }
  check('بعد از چند تلاش ناموفق قفل می‌شود → 429', blocked);

  const rows = await query('SELECT ok FROM login_attempts WHERE ok = FALSE');
  check('تلاش‌های ناموفق با بولی ثبت شده‌اند', rows.rows.length >= 1 && rows.rows[0].ok === false);
}

console.log('\n=== ۱۶. ماندگاری داده پس از راه‌اندازی دوباره ===');
if (currentDriver() === 'pglite' && process.env.PGLITE_DIR) {
  await new Promise((r) => server.close(r));
  await closeDb();

  await connect();          // اتصال تازه به همان پوشه
  await applySchema();      // باید بی‌خطر باشد
  server = await start.call(null).catch(() => null) || null;

  const rows = await query('SELECT email, phone, first_name FROM users WHERE email = $1', [user.email]);
  check('کاربر پس از راه‌اندازی دوباره هنوز هست', rows.rows.length === 1, rows.rows);
  check('اطلاعات کاربر درست مانده',
    rows.rows[0]?.email === user.email && rows.rows[0]?.phone === user.phone, rows.rows[0]);
} else {
  console.log('  (رد شد — فقط برای PGlite روی دیسک)');
}

console.log(`\n================  PASS ${pass}  /  FAIL ${fail}  ================\n`);

try { if (server) await new Promise((r) => server.close(r)); } catch { /* بسته است */ }
await closeDb();
fs.rmSync(testDir, { recursive: true, force: true });
process.exit(fail === 0 ? 0 : 1);
