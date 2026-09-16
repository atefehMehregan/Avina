/* ============================================================================
 * server.js — نقطه شروع API آوینا
 * ----------------------------------------------------------------------------
 * فقط API است؛ هیچ HTML سرو نمی‌کند. فرانت جای دیگری (GitHub Pages) میزبانی
 * می‌شود و از راه HTTPS با این سرویس حرف می‌زند.
 *
 * ترتیب راه‌اندازی مهم است: اول اتصال به پایگاه داده و ساخت جدول‌ها، بعد
 * گوش دادن روی پورت. اگر جدول‌ها نباشند سرویس نباید ترافیک بپذیرد.
 * ==========================================================================*/
import express from 'express';
import cookieParser from 'cookie-parser';
import { pathToFileURL } from 'node:url';
import { config } from './config.js';
import { connect, applySchema, closeDb, currentDriver } from './db/index.js';
import { authRouter } from './routes/auth.js';
import { readSession, purgeExpiredSessions } from './lib/session.js';
import {
  cors, securityHeaders, errorHandler, notFound,
} from './middleware/security.js';

export const app = express();

/* پشت پراکسی (Render، Railway، Fly، Nginx) آی‌پی واقعی در X-Forwarded-For است. */
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(securityHeaders);
app.use(cors);
app.use(express.json({ limit: '16kb' }));  // بدنه بزرگ رد می‌شود
app.use(cookieParser());

/* آی‌پی یک‌بار حساب می‌شود تا همه‌جا یکسان باشد. */
app.use((req, res, next) => {
  req.clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
  next();
});

/* نشست را از کوکی می‌خوانیم و روی req می‌گذاریم. نبودنش خطا نیست؛
   مسیرهایی که نیاز دارند خودشان بررسی می‌کنند. */
app.use(async (req, res, next) => {
  try {
    req.session = await readSession(req.cookies?.[config.cookie.name]);
    next();
  } catch (err) {
    next(err);
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'avina-api', env: config.env, time: new Date().toISOString() });
});

app.use('/api/auth', authRouter);

app.use(notFound);
app.use(errorHandler);

/**
 * راه‌اندازی: اتصال، ساخت جدول‌ها، سپس گوش دادن.
 * در آزمون‌ها می‌شود فقط app را import کرد و این را صدا نزد.
 */
export async function start() {
  await connect();
  await applySchema();

  const server = app.listen(config.port, () => {
    console.log(`[avina-api] روی پورت ${config.port} در حالت ${config.env}`);
    console.log(`[avina-api] پایگاه داده: PostgreSQL (راننده ${currentDriver()})`);
    console.log(`[avina-api] مبداهای مجاز: ${config.allowedOrigins.join(', ')}`);
  });

  /* نظافت نشست‌های منقضی: یک بار در شروع و بعد هر شش ساعت. */
  purgeExpiredSessions().catch((err) => console.error('[cleanup]', err.message));
  const cleanup = setInterval(
    () => purgeExpiredSessions().catch((err) => console.error('[cleanup]', err.message)),
    6 * 60 * 60 * 1000
  );
  cleanup.unref();

  async function shutdown(signal) {
    console.log(`[avina-api] ${signal} — بستن سرور`);
    server.close(async () => {
      await closeDb();
      process.exit(0);
    });
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

/* اگر این فایل مستقیم اجرا شود سرور را بالا می‌آورد؛ اگر فقط import شود
   (مثلا در آزمون) کاری نمی‌کند. مقایسه روی مسیر واقعی است، نه نام فایل. */
const isDirectRun =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  start().catch((err) => {
    console.error('[avina-api] راه‌اندازی شکست خورد:', err.message);
    process.exit(1);
  });
}
