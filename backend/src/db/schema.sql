-- ============================================================================
-- schema.sql — پایگاه داده آوینا (PostgreSQL)
-- ----------------------------------------------------------------------------
-- فقط جدول‌های «کاربر» و «نشست» الان استفاده می‌شوند. بقیه جدول‌ها از همین
-- ابتدا ساخته می‌شوند تا بعدا برای سفارش و پرداخت لازم نباشد ساختار عوض شود.
--
-- قاعده‌ها:
--   * شناسه‌ها UUID هستند، نه عدد پشت‌سرهم، تا از بیرون قابل حدس زدن نباشند.
--     مقدارشان را برنامه می‌سازد (crypto.randomUUID) تا به افزونه‌ای مثل
--     pgcrypto وابسته نباشیم و روی هر ارائه‌دهنده‌ای کار کند.
--   * مبلغ‌ها BIGINT تومان‌اند؛ اعشار شناور برای پول هرگز.
--   * زمان‌ها TIMESTAMPTZ‌اند (در SQLite رشته متنی بودند).
--   * بولی‌ها BOOLEAN‌اند (در SQLite عدد ۰/۱ بودند).
--   * رمز هرگز اینجا نیست؛ فقط هش آن.
--
-- این فایل idempotent است: هر بار اجرا شود، داده موجود دست نمی‌خورد.
-- ==========================================================================*/

-- ------------------------------------------------------------------ کاربران
CREATE TABLE IF NOT EXISTS users (
  id                UUID        PRIMARY KEY,
  first_name        TEXT        NOT NULL,
  last_name         TEXT        NOT NULL,
  email             TEXT        NOT NULL,
  phone             TEXT        NOT NULL,
  password_hash     TEXT        NOT NULL,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  email_verified_at TIMESTAMPTZ,
  phone_verified_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ایمیل همیشه lowercase ذخیره می‌شود، پس ایندکس ساده کافی است
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users (phone);

-- ------------------------------------------------------------------- نشست‌ها
-- خودِ توکن نشست ذخیره نمی‌شود، فقط SHA-256 آن. اگر دیتابیس لو برود،
-- کسی نمی‌تواند با محتوای جدول جای کاربر جا بزند.
CREATE TABLE IF NOT EXISTS sessions (
  id           UUID        PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash   TEXT        NOT NULL UNIQUE,
  csrf_hash    TEXT        NOT NULL,
  user_agent   TEXT,
  ip           TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

-- --------------------------------------------------- تلاش‌های ورود ناموفق
-- برای کند کردن حمله جست‌وجوی فراگیر و پر کردن اعتبارنامه.
-- در SQLite این INTEGER PRIMARY KEY AUTOINCREMENT بود.
CREATE TABLE IF NOT EXISTS login_attempts (
  id         BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier TEXT        NOT NULL,   -- ایمیل یا موبایل واردشده (نرمال‌شده)
  ip         TEXT        NOT NULL,
  ok         BOOLEAN     NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attempts_identifier ON login_attempts (identifier, created_at);
CREATE INDEX IF NOT EXISTS idx_attempts_ip ON login_attempts (ip, created_at);

-- =========================================================================
-- از اینجا به بعد هنوز استفاده نمی‌شود — برای مرحله سفارش و پرداخت
-- =========================================================================

CREATE TABLE IF NOT EXISTS addresses (
  id          UUID        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title       TEXT,
  receiver    TEXT        NOT NULL,
  phone       TEXT        NOT NULL,
  province    TEXT        NOT NULL,
  city        TEXT        NOT NULL,
  postal_code TEXT,
  line1       TEXT        NOT NULL,
  line2       TEXT,
  is_default  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses (user_id);

CREATE TABLE IF NOT EXISTS orders (
  id             UUID        PRIMARY KEY,
  user_id        UUID        NOT NULL REFERENCES users (id)     ON DELETE RESTRICT,
  address_id     UUID                 REFERENCES addresses (id) ON DELETE SET NULL,
  code           TEXT        NOT NULL UNIQUE,      -- شماره سفارش قابل نمایش
  status         TEXT        NOT NULL DEFAULT 'pending',
  subtotal_toman BIGINT      NOT NULL DEFAULT 0,
  discount_toman BIGINT      NOT NULL DEFAULT 0,
  shipping_toman BIGINT      NOT NULL DEFAULT 0,
  total_toman    BIGINT      NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id, created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id         UUID   PRIMARY KEY,
  order_id   UUID   NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id TEXT   NOT NULL,             -- مثل p03 در data.js
  name       TEXT   NOT NULL,             -- کپی نام در لحظه خرید
  unit_toman BIGINT NOT NULL,
  quantity   INTEGER NOT NULL,
  line_toman BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items (order_id);

CREATE TABLE IF NOT EXISTS payments (
  id           UUID        PRIMARY KEY,
  order_id     UUID        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  gateway      TEXT        NOT NULL,             -- مثلا zarinpal
  amount_toman BIGINT      NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'initiated',
  authority    TEXT,                             -- شناسه درگاه هنگام شروع پرداخت
  ref_id       TEXT,                             -- کد رهگیری بعد از تایید
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments (order_id);
