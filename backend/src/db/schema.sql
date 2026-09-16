-- ============================================================================
-- schema.sql — پایگاه داده آوینا
-- ----------------------------------------------------------------------------
-- فقط جدول‌های «کاربر» و «نشست» الان استفاده می‌شوند. بقیه جدول‌ها از همین
-- ابتدا ساخته می‌شوند تا بعدا برای سفارش و پرداخت لازم نباشد ساختار عوض شود.
--
-- قاعده‌ها:
--   * شناسه‌ها UUID متنی‌اند، نه عدد پشت‌سرهم، تا از بیرون قابل حدس زدن نباشند.
--   * مبلغ‌ها عدد صحیح تومان‌اند؛ اعشار شناور برای پول امن نیست.
--   * زمان‌ها ISO-8601 در UTC.
--   * رمز هرگز اینجا نیست؛ فقط هش آن.
-- ==========================================================================*/

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------------ کاربران
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  first_name    TEXT    NOT NULL,
  last_name     TEXT    NOT NULL,
  email         TEXT    NOT NULL,
  phone         TEXT    NOT NULL,
  password_hash TEXT    NOT NULL,
  is_active     INTEGER NOT NULL DEFAULT 1,
  email_verified_at TEXT,
  phone_verified_at TEXT,
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL
);

-- یکتایی بدون حساسیت به حروف بزرگ و کوچک؛ ایمیل همیشه lowercase ذخیره می‌شود
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users (phone);

-- ------------------------------------------------------------------- نشست‌ها
-- خودِ توکن نشست ذخیره نمی‌شود، فقط SHA-256 آن. اگر دیتابیس لو برود،
-- کسی نمی‌تواند با محتوای جدول جای کاربر جا بزند.
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_hash  TEXT NOT NULL,
  user_agent TEXT,
  ip         TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

-- --------------------------------------------------- تلاش‌های ورود ناموفق
-- برای کند کردن حمله جست‌وجوی فراگیر و پر کردن اعتبارنامه.
CREATE TABLE IF NOT EXISTS login_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,   -- ایمیل یا موبایل واردشده (نرمال‌شده)
  ip         TEXT NOT NULL,
  ok         INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_identifier ON login_attempts (identifier, created_at);
CREATE INDEX IF NOT EXISTS idx_attempts_ip ON login_attempts (ip, created_at);

-- =========================================================================
-- از اینجا به بعد هنوز استفاده نمی‌شود — برای مرحله سفارش و پرداخت
-- =========================================================================

CREATE TABLE IF NOT EXISTS addresses (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  title        TEXT,
  receiver     TEXT NOT NULL,
  phone        TEXT NOT NULL,
  province     TEXT NOT NULL,
  city         TEXT NOT NULL,
  postal_code  TEXT,
  line1        TEXT NOT NULL,
  line2        TEXT,
  is_default   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses (user_id);

CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  address_id    TEXT,
  code          TEXT NOT NULL UNIQUE,      -- شماره سفارش قابل نمایش
  status        TEXT NOT NULL DEFAULT 'pending',
  subtotal_toman INTEGER NOT NULL DEFAULT 0,
  discount_toman INTEGER NOT NULL DEFAULT 0,
  shipping_toman INTEGER NOT NULL DEFAULT 0,
  total_toman    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  FOREIGN KEY (user_id)    REFERENCES users (id)     ON DELETE RESTRICT,
  FOREIGN KEY (address_id) REFERENCES addresses (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id, created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id            TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL,
  product_id    TEXT NOT NULL,             -- مثل p03 در data.js
  name          TEXT NOT NULL,             -- کپی نام در لحظه خرید
  unit_toman    INTEGER NOT NULL,
  quantity      INTEGER NOT NULL,
  line_toman    INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items (order_id);

CREATE TABLE IF NOT EXISTS payments (
  id            TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL,
  gateway       TEXT NOT NULL,             -- مثلا zarinpal
  amount_toman  INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'initiated',
  authority     TEXT,                      -- شناسه درگاه هنگام شروع پرداخت
  ref_id        TEXT,                      -- کد رهگیری بعد از تایید
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments (order_id);
