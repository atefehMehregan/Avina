/* ============================================================================
 * config.js — همه تنظیمات از محیط خوانده می‌شود، هیچ رازی داخل کد نیست.
 * ==========================================================================*/
import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`متغیر محیطی ${name} تعریف نشده است.`);
  }
  return value;
}

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';
const isTest = env === 'test';

/* ------------------------------------------------------------ پایگاه داده */

/* راننده: اگر صریحا تعیین نشده باشد، نبودِ DATABASE_URL در حالت آزمون یعنی
   PostgreSQL محلی نداریم و از PGlite استفاده می‌کنیم. */
const explicitDriver = process.env.DATABASE_DRIVER;
const databaseUrl = process.env.DATABASE_URL || '';
const driver = explicitDriver || (!databaseUrl && isTest ? 'pglite' : 'pg');

/**
 * تنظیم SSL.
 *
 * ارائه‌دهنده‌های ابری (Supabase، Neon، Render) اتصال رمزنگاری‌شده می‌خواهند.
 * پیش‌فرض ما در تولید: SSL روشن با بررسی گواهی.
 *
 * بعضی ارائه‌دهنده‌ها گواهی خودامضا می‌دهند؛ فقط در آن حالت و فقط با تنظیم
 * صریح DATABASE_SSL=no-verify بررسی گواهی خاموش می‌شود. این کار به‌صورت
 * پیش‌فرض انجام نمی‌شود چون جلوی حمله مرد-میانی را باز می‌گذارد.
 */
function sslSetting() {
  const mode = (process.env.DATABASE_SSL || '').toLowerCase();
  if (mode === 'off' || mode === 'false' || mode === 'disable') return false;
  if (mode === 'no-verify') return { rejectUnauthorized: false };
  if (mode === 'on' || mode === 'true' || mode === 'require') return { rejectUnauthorized: true };

  /* تعیین‌نشده: در تولید روشن، در توسعه خاموش (PostgreSQL محلی معمولا TLS ندارد).
     اگر خودِ رشته اتصال sslmode داشته باشد، به pg می‌سپاریم. */
  if (/[?&]sslmode=/i.test(databaseUrl)) return undefined;
  return isProd ? { rejectUnauthorized: true } : false;
}

export const config = {
  env,
  isProd,
  isTest,
  port: Number(process.env.PORT || 4000),

  database: {
    driver,
    url: databaseUrl,
    ssl: sslSetting(),
    poolMax: Number(process.env.DATABASE_POOL_MAX || 10),
    /* فقط برای pglite: اگر مسیر بدهید روی دیسک می‌ماند، وگرنه در حافظه. */
    pgliteDir: process.env.PGLITE_DIR || '',
  },

  /* فقط همین مبداها اجازه دارند با کوکی درخواست بدهند. * هرگز. */
  allowedOrigins: (process.env.ALLOWED_ORIGINS ||
    'https://atefehmehregan.github.io,http://localhost:8080,http://127.0.0.1:8080')
    .split(',').map((s) => s.trim()).filter(Boolean),

  cookie: {
    name: process.env.SESSION_COOKIE_NAME || 'avina_session',
    csrfName: process.env.CSRF_COOKIE_NAME || 'avina_csrf',
    /* فرانت روی github.io است و بک‌اند جای دیگر، پس کوکی cross-site است و
       در تولید باید SameSite=None + Secure باشد. روی http محلی مرورگر
       SameSite=None را بدون Secure قبول نمی‌کند، پس آنجا Lax می‌شود. */
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAgeDays: Number(process.env.SESSION_DAYS || 30),
  },

  /* پارامترهای Argon2id — طبق راهنمای OWASP */
  argon: {
    memoryCost: Number(process.env.ARGON_MEMORY_KIB || 19456), // 19 MiB
    timeCost: Number(process.env.ARGON_TIME || 2),
    parallelism: Number(process.env.ARGON_PARALLELISM || 1),
  },

  rateLimit: {
    loginMaxPerIdentifier: 5,    // در پنجره زیر
    loginMaxPerIp: 20,
    windowMinutes: 15,
    registerMaxPerIp: 10,
  },
};

/* در تولید نبود مقدارهای حیاتی باید زود و پرصدا خطا بدهد. */
if (isProd) {
  required('ALLOWED_ORIGINS');
  required('DATABASE_URL');
  if (config.allowedOrigins.includes('*')) {
    throw new Error('ALLOWED_ORIGINS نباید * باشد؛ درخواست‌ها کوکی‌دار هستند.');
  }
  if (config.database.driver !== 'pg') {
    throw new Error('در تولید فقط راننده pg مجاز است.');
  }
}

/* بیرون از تولید هم اگر راننده pg است، بدون رشته اتصال کاری نمی‌شود کرد. */
if (config.database.driver === 'pg' && !config.database.url) {
  throw new Error(
    'DATABASE_URL تعریف نشده است. یک رشته اتصال PostgreSQL بدهید، ' +
    'یا برای آزمون محلی DATABASE_DRIVER=pglite بگذارید.'
  );
}
