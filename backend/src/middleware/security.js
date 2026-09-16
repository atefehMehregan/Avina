/* ============================================================================
 * security.js — CORS، CSRF، محدودیت نرخ، هدرهای امنیتی، مدیریت خطا
 * ==========================================================================*/
import { db, nowIso } from '../db/index.js';
import { config } from '../config.js';
import { sha256, safeEqual } from '../lib/session.js';

/* ------------------------------------------------------------------- CORS */
/* درخواست‌ها کوکی‌دار هستند، پس * ممنوع است: مرورگر هم آن را رد می‌کند و هم
   ناامن است. فقط مبداهای فهرست‌شده اجازه دارند. */
export function cors(req, res, next) {
  const origin = req.headers.origin;

  if (origin && config.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  /* Vary لازم است وگرنه پاسخ یک مبدا برای مبدای دیگر کش می‌شود. */
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    /* مبدا ناشناس حتی preflight هم نمی‌گیرد. */
    if (!origin || !config.allowedOrigins.includes(origin)) return res.sendStatus(403);
    return res.sendStatus(204);
  }
  next();
}

/* -------------------------------------------------------- هدرهای امنیتی */
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  /* این API فقط JSON می‌دهد و هیچ HTML اجرا نمی‌کند. */
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  res.removeHeader('X-Powered-By');
  next();
}

/* ------------------------------------------------------------------- CSRF */
/* کوکی نشست SameSite=None است (چون فرانت و بک‌اند هم‌دامنه نیستند)، پس
   تنها تکیه بر SameSite کافی نیست. الگوی double-submit:
   سرور یک توکن CSRF در کوکیِ قابل خواندن می‌گذارد، فرانت همان را در هدر
   X-CSRF-Token برمی‌گرداند، و سرور با هشِ ذخیره‌شده در نشست می‌سنجد. */
export function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!req.session) return next(); // مسیرهای بدون نشست (ثبت‌نام/ورود) نیاز ندارند

  const sent = req.headers['x-csrf-token'];
  if (!sent || !safeEqual(sha256(sent), req.session.csrf_hash)) {
    return res.status(403).json({ ok: false, message: 'درخواست معتبر نیست. صفحه را تازه کنید.' });
  }
  next();
}

/* -------------------------------------------------------- محدودیت نرخ */
const countByIdentifier = db.prepare(
  "SELECT COUNT(*) AS n FROM login_attempts WHERE identifier = ? AND ok = 0 AND created_at > ?"
);
const countByIp = db.prepare(
  "SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND ok = 0 AND created_at > ?"
);
const insertAttempt = db.prepare(
  'INSERT INTO login_attempts (identifier, ip, ok, created_at) VALUES (?, ?, ?, ?)'
);

export function recordLoginAttempt(identifier, ip, ok) {
  insertAttempt.run(String(identifier).slice(0, 254), String(ip).slice(0, 64), ok ? 1 : 0, nowIso());
}

function windowStart() {
  return new Date(Date.now() - config.rateLimit.windowMinutes * 60 * 1000).toISOString();
}

/**
 * آیا این ترکیب شناسه/آی‌پی فعلا قفل است؟
 * شمارش روی «تلاش ناموفق» است تا ورود درست کسی را قفل نکند.
 */
export function isLoginBlocked(identifier, ip) {
  const since = windowStart();
  const byId = countByIdentifier.get(identifier, since).n;
  const byIp = countByIp.get(ip, since).n;
  return (
    byId >= config.rateLimit.loginMaxPerIdentifier ||
    byIp >= config.rateLimit.loginMaxPerIp
  );
}

/* محدودیت ساده ثبت‌نام بر پایه حافظه — برای یک نمونه کافی است. */
const registerHits = new Map();
export function registerLimiter(req, res, next) {
  const ip = req.clientIp;
  const now = Date.now();
  const windowMs = config.rateLimit.windowMinutes * 60 * 1000;
  const hits = (registerHits.get(ip) || []).filter((t) => now - t < windowMs);
  if (hits.length >= config.rateLimit.registerMaxPerIp) {
    return res.status(429).json({
      ok: false,
      message: 'تعداد درخواست‌ها زیاد بود. چند دقیقه دیگر دوباره تلاش کنید.',
    });
  }
  hits.push(now);
  registerHits.set(ip, hits);
  next();
}

/* --------------------------------------------------------- خطاهای کلی */
/* جزئیات خطای دیتابیس هرگز به کاربر نمی‌رسد؛ فقط در لاگ سرور می‌ماند. */
export function errorHandler(err, req, res, _next) {
  const id = Math.random().toString(36).slice(2, 10);
  console.error(`[error ${id}]`, err?.message, err?.stack?.split('\n')[1]?.trim() || '');
  if (res.headersSent) return;
  res.status(500).json({ ok: false, message: 'خطای داخلی سرور. بعدا دوباره تلاش کنید.', ref: id });
}

export function notFound(req, res) {
  res.status(404).json({ ok: false, message: 'این مسیر وجود ندارد.' });
}
