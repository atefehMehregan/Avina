/* ============================================================================
 * password.js — هش کردن رمز با Argon2id
 * ----------------------------------------------------------------------------
 * الگوریتم دست‌ساز ننوشته‌ایم؛ از کتابخانه رسمی argon2 استفاده می‌شود.
 * Argon2id توصیه فعلی OWASP برای ذخیره رمز است.
 * ==========================================================================*/
import argon2 from 'argon2';
import { config } from '../config.js';

const OPTIONS = {
  type: argon2.argon2id,
  memoryCost: config.argon.memoryCost,
  timeCost: config.argon.timeCost,
  parallelism: config.argon.parallelism,
};

export function hashPassword(plain) {
  return argon2.hash(plain, OPTIONS);
}

/** مقایسه امن. اگر هش خراب باشد false برمی‌گرداند، نه خطا. */
export async function verifyPassword(hash, plain) {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
