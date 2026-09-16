/* ============================================================================
 * config.js — همه تنظیمات از محیط خوانده می‌شود، هیچ رازی داخل کد نیست.
 * ==========================================================================*/
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`متغیر محیطی ${name} تعریف نشده است.`);
  }
  return value;
}

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

export const config = {
  env,
  isProd,
  port: Number(process.env.PORT || 4000),
  databaseFile: process.env.DATABASE_FILE || path.join(root, 'data', 'avina.sqlite'),

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

/* در تولید نبود کلید یا مبدا نامعتبر باید زود و پرصدا خطا بدهد. */
if (isProd) {
  required('ALLOWED_ORIGINS');
  if (config.allowedOrigins.includes('*')) {
    throw new Error('ALLOWED_ORIGINS نباید * باشد؛ درخواست‌ها کوکی‌دار هستند.');
  }
}
