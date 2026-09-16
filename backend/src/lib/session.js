/* ============================================================================
 * session.js — نشست‌های قابل ابطال
 * ----------------------------------------------------------------------------
 * چرا JWT نه؟ چون «خروج» با JWT واقعی نیست؛ توکن تا انقضا معتبر می‌ماند.
 * اینجا توکن تصادفی است و وضعیتش در دیتابیس نگه داشته می‌شود، پس خروج
 * و «خروج از همه دستگاه‌ها» واقعا کار می‌کند — چیزی که برای حساب خرید لازم است.
 *
 * خودِ توکن در دیتابیس ذخیره نمی‌شود، فقط SHA-256 آن. اگر دیتابیس لو برود،
 * کسی نمی‌تواند با محتوای جدول جای کاربر جا بزند.
 * ==========================================================================*/
import crypto from 'node:crypto';
import { db, nowIso } from '../db/index.js';
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

const insertSession = db.prepare(`
  INSERT INTO sessions (id, user_id, token_hash, csrf_hash, user_agent, ip,
                        created_at, last_seen_at, expires_at)
  VALUES (@id, @user_id, @token_hash, @csrf_hash, @user_agent, @ip,
          @created_at, @last_seen_at, @expires_at)
`);

export function createSession(userId, { userAgent, ip } = {}) {
  const token = randomToken();
  const csrf = randomToken(24);
  const now = new Date();
  insertSession.run({
    id: crypto.randomUUID(),
    user_id: userId,
    token_hash: sha256(token),
    csrf_hash: sha256(csrf),
    user_agent: String(userAgent || '').slice(0, 300),
    ip: String(ip || '').slice(0, 64),
    created_at: now.toISOString(),
    last_seen_at: now.toISOString(),
    expires_at: new Date(now.getTime() + config.cookie.maxAgeDays * DAY_MS).toISOString(),
  });
  return { token, csrf };
}

const findByHash = db.prepare(`
  SELECT id, user_id, csrf_hash, expires_at, revoked_at
  FROM sessions WHERE token_hash = ?
`);
const touchSession = db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?');

/** نشست معتبر را برمی‌گرداند، وگرنه null. */
export function readSession(token) {
  if (!token) return null;
  const row = findByHash.get(sha256(token));
  if (!row) return null;
  if (row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;
  touchSession.run(nowIso(), row.id);
  return row;
}

const revokeOne = db.prepare(
  'UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL'
);
export function revokeSession(token) {
  if (!token) return;
  revokeOne.run(nowIso(), sha256(token));
}

const revokeMany = db.prepare(
  'UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL'
);
export function revokeAllForUser(userId) {
  revokeMany.run(nowIso(), userId);
}

/** نظافت دوره‌ای: نشست‌های منقضی و باطل‌شده قدیمی. */
const purge = db.prepare('DELETE FROM sessions WHERE expires_at < ? OR revoked_at < ?');
export function purgeExpiredSessions() {
  const cutoff = new Date(Date.now() - 7 * DAY_MS).toISOString();
  return purge.run(nowIso(), cutoff).changes;
}
