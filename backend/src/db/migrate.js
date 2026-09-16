/* اجرای schema.sql. چند بار اجرا کردن بی‌خطر است (IF NOT EXISTS). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './index.js';
import { config } from '../config.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8');
db.exec(sql);

const tables = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
).all().map((r) => r.name);

console.log('پایگاه داده:', config.databaseFile);
console.log('جدول‌ها:', tables.join(', '));
