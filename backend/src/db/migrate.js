/* ============================================================================
 * migrate.js — ساخت/به‌روزرسانی جدول‌ها و گزارش وضعیت
 * ----------------------------------------------------------------------------
 * از نسخه فعلی، خودِ سرور هم هنگام بالا آمدن همین کار را می‌کند، پس اجرای
 * این دستور برای راه‌اندازی الزامی نیست. اینجا می‌ماند چون برای بررسی
 * دستی و دیدن فهرست جدول‌ها پس از استقرار مفید است.
 *
 * چند بار اجرا کردن بی‌خطر است (CREATE ... IF NOT EXISTS).
 * ==========================================================================*/
import { db, applySchema } from './index.js';
import { config } from '../config.js';

applySchema();

const tables = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
).all().map((r) => r.name);

const users = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;

console.log('پایگاه داده:', config.databaseFile);
console.log('جدول‌ها:', tables.join(', '));
console.log('تعداد کاربران:', users);
