/* ============================================================================
 * migrate.js — ساخت/به‌روزرسانی جدول‌ها و گزارش وضعیت
 * ----------------------------------------------------------------------------
 * از نسخه فعلی، خودِ سرور هم هنگام بالا آمدن همین کار را می‌کند، پس اجرای
 * این دستور برای راه‌اندازی الزامی نیست. اینجا می‌ماند چون برای بررسی
 * دستی و دیدن وضعیت پایگاه داده پس از استقرار مفید است.
 *
 * چند بار اجرا کردن بی‌خطر است (CREATE ... IF NOT EXISTS).
 * ==========================================================================*/
import { connect, applySchema, query, closeDb, currentDriver } from './index.js';
import { config } from '../config.js';

await connect();
await applySchema();

const tables = await query(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' ORDER BY table_name`
);
const users = await query('SELECT COUNT(*)::int AS n FROM users');

console.log('راننده:', currentDriver());
console.log('پایگاه داده:', config.database.url ? config.database.url.replace(/:[^:@/]*@/, ':****@') : '(pglite محلی)');
console.log('جدول‌ها:', tables.rows.map((r) => r.table_name).join(', '));
console.log('تعداد کاربران:', users.rows[0].n);

await closeDb();
