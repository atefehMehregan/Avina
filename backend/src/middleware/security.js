/* ============================================================================
 * security.js — CORS، CSRF، محدودیت نرخ، هدرهای امنیتی، مدیریت خطا
 * ----------------------------------------------------------------------------
 * تفاوت با نسخه SQLite: توابع محدودیت نرخ async شده‌اند و پنجره زمانی با
 * INTERVAL خود PostgreSQL حساب می‌شود، نه با مقایسه رشته تاریخ.
 * ==========================================================================*/
import { query, queryOne } from '../db/index.js';
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
    /* code ماشین‌خوان است تا فرانت بتواند «۴۰۳ به‌خاطر CSRF» را از هر ۴۰۳
       دیگری تشخیص بدهد و یک بار با توکن تازه دوباره تلاش کند. تکیه بر متن
       پیام شکننده است. */
    return res.status(403).json({
      ok: false, code: 'csrf_invalid', message: 'درخواست معتبر نیست. صفحه را تازه کنید.',
    });
  }
  next();
}

/* --------------------------------------------------------- نیاز به ورود */
/* هر مسیری که داده خصوصی کاربر را لمس می‌کند باید اول از این رد شود.
 *
 * ترتیب مهم است: requireAuth باید *پیش از* requireCsrf اجرا شود. دلیلش
 * بالاتر در requireCsrf پیداست — آنجا اگر نشستی نباشد next() صدا زده
 * می‌شود (چون ثبت‌نام و ورود هنوز نشست ندارند). پس اگر ترتیب برعکس شود،
 * درخواست بدون نشست از CSRF رد می‌شود و تکیه بر requireCsrf به‌تنهایی
 * برای احراز هویت اشتباه است.
 */
export function requireAuth(req, res, next) {
  if (!req.session) {
    return res.status(401).json({ ok: false, message: 'برای این کار باید وارد حساب شوید.' });
  }
  next();
}

/* -------------------------------------------------------- محدودیت نرخ */

export async function recordLoginAttempt(identifier, ip, ok) {
  await query(
    'INSERT INTO login_attempts (identifier, ip, ok) VALUES ($1, $2, $3)',
    [String(identifier).slice(0, 254), String(ip).slice(0, 64), Boolean(ok)]
  );
}

/**
 * آیا این ترکیب شناسه/آی‌پی فعلا قفل است؟
 * شمارش روی «تلاش ناموفق» است تا ورود درست کسی را قفل نکند.
 * پنجره زمانی را خود PostgreSQL حساب می‌کند تا به ساعت سرور برنامه وابسته نباشد.
 */
export async function isLoginBlocked(identifier, ip) {
  const minutes = config.rateLimit.windowMinutes;
  const row = await queryOne(
    `SELECT
       COUNT(*) FILTER (WHERE identifier = $1) AS by_identifier,
       COUNT(*) FILTER (WHERE ip = $2)         AS by_ip
     FROM login_attempts
     WHERE ok = FALSE
       AND created_at > now() - ($3 || ' minutes')::interval`,
    [identifier, ip, String(minutes)]
  );
  return (
    Number(row.by_identifier) >= config.rateLimit.loginMaxPerIdentifier ||
    Number(row.by_ip) >= config.rateLimit.loginMaxPerIp
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
