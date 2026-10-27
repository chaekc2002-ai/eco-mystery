import { createClient } from '@libsql/client';
import { mkdirSync } from 'node:fs';
if (process.env.VERCEL && !process.env.TURSO_DATABASE_URL) {
  throw new Error('Vercel requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN for persistent storage.');
}
if (process.env.TURSO_DATABASE_URL && !process.env.TURSO_AUTH_TOKEN) {
  throw new Error('TURSO_AUTH_TOKEN is required.');
}
if (!process.env.TURSO_DATABASE_URL) mkdirSync('.data', { recursive: true });
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${process.env.DB_PATH || '.data/game.db'}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
await db.execute('CREATE TABLE IF NOT EXISTS store (key TEXT PRIMARY KEY, value TEXT)');
export async function get(key) {
  const result = await db.execute({sql:'SELECT value FROM store WHERE key=?',args:[key]});
  return JSON.parse(result.rows[0]?.value || 'null');
}
export async function put(key,value) {
  await db.execute({sql:'INSERT OR REPLACE INTO store VALUES (?,?)',args:[key,JSON.stringify(value)]});
}
export async function all() {
  const result = await db.execute('SELECT value FROM store');
  return result.rows.map(row=>JSON.parse(row.value));
}
