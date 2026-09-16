/* ============================================================================
 * server.js — نقطه شروع API آوینا
 * ----------------------------------------------------------------------------
 * فقط API است؛ هیچ HTML سرو نمی‌کند. فرانت جای دیگری (GitHub Pages) میزبانی
 * می‌شود و از راه HTTPS با این سرویس حرف می‌زند.
 * ==========================================================================*/
import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { db } from './db/index.js';
import { authRouter } from './routes/auth.js';
import { readSession, purgeExpiredSessions } from './lib/session.js';
import {
  cors, securityHeaders, errorHandler, notFound,
} from './middleware/security.js';

const app = express();

/* پشت پراکسی (Render، Liara، Nginx) آی‌پی واقعی در X-Forwarded-For است. */
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
app.use((req, res, next) => {
  req.session = readSession(req.cookies?.[config.cookie.name]);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'avina-api', env: config.env, time: new Date().toISOString() });
});

app.use('/api/auth', authRouter);

app.use(notFound);
app.use(errorHandler);

/* نظافت نشست‌های منقضی: یک بار در شروع و بعد هر شش ساعت. */
purgeExpiredSessions();
const cleanup = setInterval(purgeExpiredSessions, 6 * 60 * 60 * 1000);
cleanup.unref();

const server = app.listen(config.port, () => {
  console.log(`[avina-api] روی پورت ${config.port} در حالت ${config.env}`);
  console.log(`[avina-api] مبداهای مجاز: ${config.allowedOrigins.join(', ')}`);
});

function shutdown(signal) {
  console.log(`[avina-api] ${signal} — بستن سرور`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
