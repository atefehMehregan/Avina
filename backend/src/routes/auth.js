/* ============================================================================
 * routes/auth.js — ثبت‌نام، ورود، خروج، کاربر جاری
 * ----------------------------------------------------------------------------
 * قاعده‌هایی که در همه این مسیرها رعایت شده:
 *   * هیچ پاسخی password_hash یا فیلد داخلی برنمی‌گرداند (تابع publicUser).
 *   * فقط فیلدهای مشخص از بدنه خوانده می‌شود، نه ...req.body (mass assignment).
 *   * پیام خطای ورود عمدا مبهم است تا نشود فهمید کدام حساب وجود دارد.
 *   * همه کوئری‌ها پارامتری‌اند ($1، $2 ...).
 *
 * قرارداد API با فرانت تغییر نکرده؛ فقط پایگاه داده زیرش عوض شده است.
 * ==========================================================================*/
import express from 'express';
import crypto from 'node:crypto';
import { query, queryOne } from '../db/index.js';
import { config } from '../config.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { validateRegistration, validateLogin } from '../lib/validate.js';
import { createSession, revokeSession, revokeAllForUser, rotateCsrf } from '../lib/session.js';
import {
  recordLoginAttempt, isLoginBlocked, registerLimiter, requireCsrf,
} from '../middleware/security.js';

export const authRouter = express.Router();

/* کد خطای PostgreSQL برای نقض قید یکتایی. در SQLite این با متن پیام
   تشخیص داده می‌شد؛ کد عددی قابل اتکاتر است. */
const UNIQUE_VIOLATION = '23505';

/* ------------------------------------------------------------- کمکی‌ها */

/** فقط فیلدهای بی‌خطر برای نمایش. password_hash هرگز اینجا نیست. */
function publicUser(row) {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    created_at: row.created_at,
  };
}

function sessionCookieOptions() {
  return {
    httpOnly: true,                    // جاوااسکریپت صفحه نمی‌تواند بخواندش
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    domain: config.cookie.domain,
    path: '/',
    maxAge: config.cookie.maxAgeDays * 24 * 60 * 60 * 1000,
  };
}

/** کوکی CSRF عمدا httpOnly نیست؛ فرانت باید بتواند بخواند و در هدر بفرستد. */
function csrfCookieOptions() {
  return { ...sessionCookieOptions(), httpOnly: false };
}

async function issueSession(res, userId, req) {
  const { token, csrf } = await createSession(userId, {
    userAgent: req.headers['user-agent'],
    ip: req.clientIp,
  });
  res.cookie(config.cookie.name, token, sessionCookieOptions());
  res.cookie(config.cookie.csrfName, csrf, csrfCookieOptions());
  return csrf;
}

function clearSessionCookies(res) {
  const base = { ...sessionCookieOptions(), maxAge: undefined };
  res.clearCookie(config.cookie.name, base);
  res.clearCookie(config.cookie.csrfName, { ...base, httpOnly: false });
}

/* --------------------------------------------------- POST /api/auth/register */

authRouter.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const check = validateRegistration(req.body);
    if (!check.ok) {
      return res.status(422).json({
        ok: false, message: 'اطلاعات واردشده کامل یا درست نیست.', errors: check.errors,
      });
    }
    const { first, last, email, phone, password } = check.value;

    if (await queryOne('SELECT id FROM users WHERE email = $1', [email])) {
      return res.status(409).json({
        ok: false,
        message: 'این ایمیل قبلا ثبت شده است.',
        errors: { email: 'این ایمیل قبلا ثبت شده است. وارد شوید یا ایمیل دیگری بدهید.' },
      });
    }
    if (await queryOne('SELECT id FROM users WHERE phone = $1', [phone])) {
      return res.status(409).json({
        ok: false,
        message: 'این شماره موبایل قبلا ثبت شده است.',
        errors: { phone: 'این شماره موبایل قبلا ثبت شده است.' },
      });
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    let created;
    try {
      created = await queryOne(
        `INSERT INTO users (id, first_name, last_name, email, phone, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, first_name, last_name, email, phone, created_at`,
        [id, first, last, email, phone, passwordHash]
      );
    } catch (err) {
      /* اگر دو درخواست هم‌زمان برسند، ایندکس یکتا اینجا خطا می‌دهد. */
      if (err.code === UNIQUE_VIOLATION) {
        return res.status(409).json({ ok: false, message: 'این حساب قبلا ثبت شده است.' });
      }
      throw err;
    }

    const csrf = await issueSession(res, created.id, req);
    /* توکن خام در بدنه هم می‌آید: فرانت روی دامنه دیگری است و کوکی CSRF
       را نمی‌تواند بخواند. کوکی برای حالت هم‌دامنه سر جایش می‌ماند. */
    return res.status(201).json({
      ok: true, message: 'حساب شما ساخته شد. خوش آمدید!', user: publicUser(created),
      csrf_token: csrf,
    });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------ POST /api/auth/login */

authRouter.post('/login', async (req, res, next) => {
  try {
    const check = validateLogin(req.body);
    if (!check.ok) {
      return res.status(422).json({
        ok: false, message: 'ایمیل/موبایل و رمز را وارد کنید.', errors: check.errors,
      });
    }
    const { identifier, password } = check.value;
    const ip = req.clientIp;

    if (await isLoginBlocked(identifier, ip)) {
      return res.status(429).json({
        ok: false,
        message: 'تلاش‌های ناموفق زیاد بود. چند دقیقه صبر کنید و دوباره تلاش کنید.',
      });
    }

    const row = await queryOne(
      'SELECT * FROM users WHERE email = $1 OR phone = $1 LIMIT 1',
      [identifier]
    );

    /* حتی وقتی کاربر نیست یک هش ساختگی می‌سنجیم تا زمان پاسخ لو ندهد
       که این حساب وجود دارد یا نه. */
    const hash = row ? row.password_hash : '$argon2id$v=19$m=19456,t=2,p=1$' +
      'AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const good = await verifyPassword(hash, password);

    if (!row || !good || !row.is_active) {
      await recordLoginAttempt(identifier, ip, false);
      return res.status(401).json({
        ok: false, message: 'ایمیل/موبایل یا رمز درست نیست.',
      });
    }

    await recordLoginAttempt(identifier, ip, true);
    const csrf = await issueSession(res, row.id, req);
    return res.json({ ok: true, message: 'خوش آمدید!', user: publicUser(row), csrf_token: csrf });
  } catch (err) {
    next(err);
  }
});

/* ----------------------------------------------------- POST /api/auth/logout */

authRouter.post('/logout', requireCsrf, async (req, res, next) => {
  try {
    await revokeSession(req.cookies?.[config.cookie.name]);
    clearSessionCookies(res);
    return res.json({ ok: true, message: 'از حساب خارج شدید.' });
  } catch (err) {
    next(err);
  }
});

/** خروج از همه دستگاه‌ها — برای وقتی کاربر نگران نفوذ است. */
authRouter.post('/logout-all', requireCsrf, async (req, res, next) => {
  try {
    if (req.session) await revokeAllForUser(req.session.user_id);
    clearSessionCookies(res);
    return res.json({ ok: true, message: 'از همه دستگاه‌ها خارج شدید.' });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------------------------------- GET /api/auth/me */

authRouter.get('/me', async (req, res, next) => {
  try {
    if (!req.session) {
      return res.status(401).json({ ok: false, message: 'وارد نشده‌اید.' });
    }
    const row = await queryOne('SELECT * FROM users WHERE id = $1', [req.session.user_id]);
    if (!row || !row.is_active) {
      clearSessionCookies(res);
      return res.status(401).json({ ok: false, message: 'وارد نشده‌اید.' });
    }

    /* توکن CSRF تازه برای این نشست.
       فقط هش توکن ذخیره می‌شود، پس توکن قبلی قابل بازخوانی نیست و باید
       یکی تازه ساخته شود. فرانت بعد از هر بار باز شدن صفحه همین را
       می‌گیرد. کوکی هم تازه می‌شود تا حالت هم‌دامنه از کار نیفتد.
       هشِ ذخیره‌شده هرگز برنمی‌گردد. */
    const csrf = await rotateCsrf(req.session.id);
    res.cookie(config.cookie.csrfName, csrf, csrfCookieOptions());

    return res.json({ ok: true, user: publicUser(row), csrf_token: csrf });
  } catch (err) {
    next(err);
  }
});
