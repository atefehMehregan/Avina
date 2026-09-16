/* ============================================================================
 * db/index.js — اتصال PostgreSQL
 * ----------------------------------------------------------------------------
 * همه کوئری‌ها پارامتری‌اند ($1, $2, ...)، نه چسباندن رشته. این تنها دفاع
 * واقعی در برابر SQL injection است.
 *
 * دو راننده پشتیبانی می‌شود و هر دو همین رابط query() را می‌دهند:
 *
 *   pg      — پیش‌فرض و تنها چیزی که در تولید استفاده می‌شود. استخر اتصال
 *             دارد، پس برای هر کوئری اتصال تازه باز نمی‌شود.
 *   pglite  — فقط برای آزمون محلی، وقتی PostgreSQL نصب نیست. این هم واقعا
 *             PostgreSQL است (کامپایل‌شده به WASM)، پس SQL همان SQL است و
 *             آزمون چیزی را شبیه‌سازی نمی‌کند. وابستگی توسعه است، نه تولید.
 *
 * انتخاب راننده: اگر DATABASE_DRIVER=pglite باشد یا DATABASE_URL نداشته
 * باشیم و NODE_ENV=test باشد → pglite. در غیر این صورت pg.
 * ==========================================================================*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const here = path.dirname(fileURLToPath(import.meta.url));

let driver = null;      // { query(text, params) -> {rows, rowCount}, end() }
let driverName = null;

/* --------------------------------------------------------------- راننده pg */
async function createPgDriver() {
  const { default: pg } = await import('pg');

  /* شناسه‌های BIGINT به‌صورت پیش‌فرض رشته برمی‌گردند (چون ممکن است از
     Number.MAX_SAFE_INTEGER بزرگ‌تر باشند). برای شمارش‌های کوچکِ ما عدد
     راحت‌تر است، ولی مبلغ‌ها را دست نمی‌زنیم — آن‌ها را جای مصرف
     تبدیل می‌کنیم تا دقت پول از بین نرود. */
  pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v))); // int8 → number

  const pool = new pg.Pool({
    connectionString: config.database.url,
    ssl: config.database.ssl,
    max: config.database.poolMax,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  /* خطای استخر نباید کل پروسه را بکشد. */
  pool.on('error', (err) => {
    console.error('[db] خطای استخر اتصال:', err.message);
  });

  return {
    query: (text, params) => pool.query(text, params),
    /* بدون پارامتر، pg از پروتکل ساده استفاده می‌کند و چند دستور پشت هم مجاز است. */
    exec: (sql) => pool.query(sql),
    end: () => pool.end(),
    raw: pool,
  };
}

/* ----------------------------------------------------------- راننده pglite */
async function createPgliteDriver() {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite(config.database.pgliteDir || undefined);
  await db.waitReady;
  return {
    query: async (text, params) => {
      const result = await db.query(text, params);
      return { rows: result.rows || [], rowCount: result.affectedRows ?? (result.rows || []).length };
    },
    /* query در PGlite پروتکل توسعه‌یافته است و فقط یک دستور می‌پذیرد
       (خطای 42601). برای کل فایل schema باید exec استفاده شود. */
    exec: (sql) => db.exec(sql),
    end: () => db.close(),
    raw: db,
  };
}

/** اتصال را می‌سازد (یک بار). */
export async function connect() {
  if (driver) return driver;
  driverName = config.database.driver;
  driver = driverName === 'pglite' ? await createPgliteDriver() : await createPgDriver();
  return driver;
}

/**
 * اجرای کوئری پارامتری.
 * @param {string} text  با جای‌نگهدار $1، $2 ...
 * @param {Array}  params
 */
export async function query(text, params) {
  if (!driver) await connect();
  return driver.query(text, params);
}

/** یک سطر یا undefined. */
export async function queryOne(text, params) {
  const result = await query(text, params);
  return result.rows[0];
}

export async function closeDb() {
  if (!driver) return;
  await driver.end();
  driver = null;
}

export function currentDriver() {
  return driverName;
}

/* ------------------------------------------------------------- ساخت جدول‌ها */

/**
 * اجرای schema.sql. idempotent است (همه CREATE ... IF NOT EXISTS).
 *
 * روی pg با قفل مشورتی اجرا می‌شود: اگر چند نمونه سرویس هم‌زمان بالا
 * بیایند، فقط یکی جدول‌ها را می‌سازد و بقیه منتظر می‌مانند. بدون این،
 * دو CREATE هم‌زمان می‌تواند خطای رقابتی بدهد.
 */
export async function applySchema() {
  const sql = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8');
  if (!driver) await connect();

  if (driverName === 'pglite') {
    await driver.exec(sql);
    return;
  }

  const client = await driver.raw.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [AVINA_MIGRATION_LOCK]);
    await client.query(sql);   // بدون پارامتر ⇒ پروتکل ساده ⇒ چند دستور مجاز
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [AVINA_MIGRATION_LOCK]);
    client.release();
  }
}

/* عدد دلخواه ولی ثابت؛ فقط باید بین نمونه‌های همین سرویس یکسان باشد. */
const AVINA_MIGRATION_LOCK = 778401;

export function nowIso() {
  return new Date().toISOString();
}
