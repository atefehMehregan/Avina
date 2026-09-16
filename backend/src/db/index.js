/* ============================================================================
 * db/index.js — اتصال SQLite
 * ----------------------------------------------------------------------------
 * همه کوئری‌ها با پارامتر (?) نوشته می‌شوند، نه با چسباندن رشته. این تنها
 * دفاع واقعی در برابر SQL injection است.
 *
 * ساختار جدول‌ها همین‌جا و در همان لحظه اتصال ساخته می‌شود. دلیلش استقرار
 * است: روی میزبانی مثل Render دیسکِ تازه خالی است، و ماژول‌های دیگر
 * (session.js و security.js) هنگام import خودشان db.prepare می‌کنند. اگر
 * جدول‌ها نباشند همان‌جا خطا می‌دهند و سرویس بالا نمی‌آید — و چون سرویس
 * بالا نمی‌آید، نمی‌شود دستور مهاجرت را هم اجرا کرد.
 *
 * اجرای دوباره بی‌خطر است: کل schema.sql از CREATE ... IF NOT EXISTS ساخته
 * شده و داده موجود را دست نمی‌زند.
 * ==========================================================================*/
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const here = path.dirname(fileURLToPath(import.meta.url));

fs.mkdirSync(path.dirname(config.databaseFile), { recursive: true });

export const db = new Database(config.databaseFile);

db.pragma('journal_mode = WAL');   // نوشتن و خواندن هم‌زمان
db.pragma('foreign_keys = ON');    // کلید خارجی در SQLite پیش‌فرض خاموش است
db.pragma('busy_timeout = 5000');

/** اجرای schema.sql — idempotent است و هر بار اجرا شدنش بی‌خطر. */
export function applySchema() {
  const sql = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8');
  db.exec(sql);
}

applySchema();

export function nowIso() {
  return new Date().toISOString();
}
