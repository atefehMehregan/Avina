/* ============================================================================
 * db/index.js — اتصال SQLite
 * ----------------------------------------------------------------------------
 * همه کوئری‌ها با پارامتر (?) نوشته می‌شوند، نه با چسباندن رشته. این تنها
 * دفاع واقعی در برابر SQL injection است.
 * ==========================================================================*/
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

fs.mkdirSync(path.dirname(config.databaseFile), { recursive: true });

export const db = new Database(config.databaseFile);

db.pragma('journal_mode = WAL');   // نوشتن و خواندن هم‌زمان
db.pragma('foreign_keys = ON');    // کلید خارجی در SQLite پیش‌فرض خاموش است
db.pragma('busy_timeout = 5000');

export function nowIso() {
  return new Date().toISOString();
}
