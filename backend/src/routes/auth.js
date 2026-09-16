/* ============================================================================
 * routes/auth.js — ثبت‌نام، ورود، خروج، کاربر جاری
 * ----------------------------------------------------------------------------
 * قاعده‌هایی که در همه این مسیرها رعایت شده:
 *   * هیچ پاسخی password_hash یا فیلد داخلی برنمی‌گرداند (تابع publicUser).
 *   * فقط فیلدهای مشخص از بدنه خوانده می‌شود، نه ...req.body (mass assignment).
 *   * پیام خطای ورود عمدا مبهم است تا نشود فهمید کدام حساب وجود دارد.
 * ==========================================================================*/
import express from 'express';
import crypto from 'node:crypto';
import { db, nowIso } from '../db/index.js';
import { config } from '../config.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { validateRegistration, validateLogin } from '../lib/validate.js';
import {
  createSession, revokeSession, revokeAllForUser,
} from '../lib/session.js';
import {
  recordLoginAttempt, isLoginBlocked, registerLimiter, requireCsrf,
} from '../middleware/security.js';

export const authRouter = express.Router();

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

function issueSession(res, userId, req) {
  const { token, csrf } = createSession(userId, {
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

const findByEmail = db.prepare('SELECT id FROM users WHERE email = ?');
const findByPhone = db.prepare('SELECT id FROM users WHERE phone = ?');
const insertUser = db.prepare(`
  INSERT INTO users (id, first_name, last_name, email, phone, password_hash,
                     is_active, created_at, updated_at)
  VALUES (@id, @first_name, @last_name, @email, @phone, @password_hash,
          1, @created_at, @updated_at)
`);

authRouter.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const check = validateRegistration(req.body);
    if (!check.ok) {
      return res.status(422).json({
        ok: false, message: 'اطلاعات واردشده کامل یا درست نیست.', errors: check.errors,
      });
    }
    const { first, last, email, phone, password } = check.value;

    if (findByEmail.get(email)) {
      return res.status(409).json({
        ok: false,
        message: 'این ایمیل قبلا ثبت شده است.',
        errors: { email: 'این ایمیل قبلا ثبت شده است. وارد شوید یا ایمیل دیگری بدهید.' },
      });
    }
    if (findByPhone.get(phone)) {
      return res.status(409).json({
        ok: false,
        message: 'این شماره موبایل قبلا ثبت شده است.',
        errors: { phone: 'این شماره موبایل قبلا ثبت شده است.' },
      });
    }

    const now = nowIso();
    const user = {
      id: crypto.randomUUID(),
      first_name: first,
      last_name: last,
      email,
      phone,
      password_hash: await hashPassword(password),
      created_at: now,
      updated_at: now,
    };

    try {
      insertUser.run(user);
    } catch (err) {
      /* اگر دو درخواست هم‌زمان برسند، ایندکس یکتا اینجا خطا می‌دهد. */
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ ok: false, message: 'این حساب قبلا ثبت شده است.' });
      }
      throw err;
    }

    issueSession(res, user.id, req);
    return res.status(201).json({
      ok: true, message: 'حساب شما ساخته شد. خوش آمدید!', user: publicUser(user),
    });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------ POST /api/auth/login */

const findForLogin = db.prepare(
  'SELECT * FROM users WHERE email = ? OR phone = ? LIMIT 1'
);

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

    if (isLoginBlocked(identifier, ip)) {
      return res.status(429).json({
        ok: false,
        message: 'تلاش‌های ناموفق زیاد بود. چند دقیقه صبر کنید و دوباره تلاش کنید.',
      });
    }

    const row = findForLogin.get(identifier, identifier);

    /* حتی وقتی کاربر نیست یک هش ساختگی می‌سنجیم تا زمان پاسخ لو ندهد
       که این حساب وجود دارد یا نه. */
    const hash = row ? row.password_hash : '$argon2id$v=19$m=19456,t=2,p=1$' +
      'AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const good = await verifyPassword(hash, password);

    if (!row || !good || !row.is_active) {
      recordLoginAttempt(identifier, ip, false);
      return res.status(401).json({
        ok: false, message: 'ایمیل/موبایل یا رمز درست نیست.',
      });
    }

    recordLoginAttempt(identifier, ip, true);
    issueSession(res, row.id, req);
    return res.json({ ok: true, message: 'خوش آمدید!', user: publicUser(row) });
  } catch (err) {
    next(err);
  }
});

/* ----------------------------------------------------- POST /api/auth/logout */

authRouter.post('/logout', requireCsrf, (req, res) => {
  revokeSession(req.cookies?.[config.cookie.name]);
  clearSessionCookies(res);
  return res.json({ ok: true, message: 'از حساب خارج شدید.' });
});

/** خروج از همه دستگاه‌ها — برای وقتی کاربر نگران نفوذ است. */
authRouter.post('/logout-all', requireCsrf, (req, res) => {
  if (req.session) revokeAllForUser(req.session.user_id);
  clearSessionCookies(res);
  return res.json({ ok: true, message: 'از همه دستگاه‌ها خارج شدید.' });
});

/* --------------------------------------------------------- GET /api/auth/me */

const findById = db.prepare('SELECT * FROM users WHERE id = ?');

authRouter.get('/me', (req, res) => {
  if (!req.session) {
    return res.status(401).json({ ok: false, message: 'وارد نشده‌اید.' });
  }
  const row = findById.get(req.session.user_id);
  if (!row || !row.is_active) {
    clearSessionCookies(res);
    return res.status(401).json({ ok: false, message: 'وارد نشده‌اید.' });
  }
  return res.json({ ok: true, user: publicUser(row) });
});
