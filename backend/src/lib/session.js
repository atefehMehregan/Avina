/* ============================================================================
 * session.js — نشست‌های قابل ابطال (PostgreSQL)
 * ----------------------------------------------------------------------------
 * چرا JWT نه؟ چون «خروج» با JWT واقعی نیست؛ توکن تا انقضا معتبر می‌ماند.
 * اینجا توکن تصادفی است و وضعیتش در دیتابیس نگه داشته می‌شود، پس خروج
 * و «خروج از همه دستگاه‌ها» واقعا کار می‌کند — چیزی که برای حساب خرید لازم است.
 *
 * خودِ توکن در دیتابیس ذخیره نمی‌شود، فقط SHA-256 آن. اگر دیتابیس لو برود،
 * کسی نمی‌تواند با محتوای جدول جای کاربر جا بزند.
 *
 * تفاوت با نسخه SQLite: همه توابع async شده‌اند و مقایسه زمان‌ها روی
 * TIMESTAMPTZ انجام می‌شود، نه روی رشته متنی.
 * ==========================================================================*/
import crypto from 'node:crypto';
import { query, queryOne } from '../db/index.js';
import { config } from '../config.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

/** مقایسه زمان‌ثابت، تا از روی زمان پاسخ نشود حدس زد. */
export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

export async function createSession(userId, { userAgent, ip } = {}) {
  const token = randomToken();
  const csrf = randomToken(24);
  const expiresAt = new Date(Date.now() + config.cookie.maxAgeDays * DAY_MS);

  await query(
    `INSERT INTO sessions (id, user_id, token_hash, csrf_hash, user_agent, ip, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      crypto.randomUUID(),
      userId,
      sha256(token),
      sha256(csrf),
      String(userAgent || '').slice(0, 300),
      String(ip || '').slice(0, 64),
      expiresAt,
    ]
  );
  return { token, csrf };
}

/**
 * نشست معتبر را برمی‌گرداند، وگرنه null.
 * شرط‌های «باطل نشده» و «منقضی نشده» داخل خود کوئری‌اند تا رفت‌وبرگشت
 * اضافه به دیتابیس نشود.
 */
export async function readSession(token) {
  if (!token) return null;
  const row = await queryOne(
    `SELECT id, user_id, csrf_hash, expires_at
     FROM sessions
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [sha256(token)]
  );
  if (!row) return null;

  /* به‌روزرسانی «آخرین بازدید» نباید جلوی پاسخ را بگیرد. */
  query('UPDATE sessions SET last_seen_at = now() WHERE id = $1', [row.id])
    .catch((err) => console.error('[session] last_seen_at:', err.message));

  return row;
}

/**
 * ساخت توکن CSRF تازه برای یک نشست موجود.
 *
 * چرا لازم است؟ الگوی double-submit فرض می‌کرد فرانت می‌تواند کوکی CSRF را
 * بخواند. وقتی فرانت روی github.io و بک‌اند روی دامنه دیگری است، کوکی
 * host-only بک‌اند برای جاوااسکریپت صفحه نامرئی است. پس توکن باید در بدنه
 * پاسخ هم برگردد. چون فقط هشِ توکن ذخیره می‌شود، توکن قبلی قابل بازخوانی
 * نیست و باید یکی تازه ساخته شود.
 *
 * فقط هش ذخیره می‌شود؛ خود توکن هیچ‌وقت در دیتابیس نمی‌نشیند.
 * @returns {Promise<string>} توکن خام، برای فرستادن به فرانت
 */
export async function rotateCsrf(sessionId) {
  const csrf = randomToken(24);
  await query('UPDATE sessions SET csrf_hash = $1 WHERE id = $2', [sha256(csrf), sessionId]);
  return csrf;
}

export async function revokeSession(token) {
  if (!token) return;
  await query(
    'UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL',
    [sha256(token)]
  );
}

export async function revokeAllForUser(userId) {
  await query(
    'UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId]
  );
}

/** نظافت دوره‌ای: نشست‌های منقضی و باطل‌شده قدیمی. */
export async function purgeExpiredSessions() {
  const result = await query(
    `DELETE FROM sessions
     WHERE expires_at < now()
        OR (revoked_at IS NOT NULL AND revoked_at < now() - INTERVAL '7 days')`
  );
  return result.rowCount;
}
