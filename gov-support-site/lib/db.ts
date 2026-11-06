import {Pool, types, type PoolClient} from 'pg';

// Return DATE columns as 'YYYY-MM-DD' strings instead of JS Dates (avoids timezone shifts).
types.setTypeParser(1082, (v) => v);

const SCHEMA = `
CREATE TABLE IF NOT EXISTS subscribers (
  email         text PRIMARY KEY,
  industries    text[] NOT NULL DEFAULT '{}',
  regions       text[] NOT NULL DEFAULT '{}',
  support_types text[] NOT NULL DEFAULT '{}',
  keywords      text[] NOT NULL DEFAULT '{}',
  stage         text NOT NULL DEFAULT '',
  frequency     text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_sent_at  timestamptz
);
CREATE TABLE IF NOT EXISTS announcements (
  id            text PRIMARY KEY,
  source        text NOT NULL,
  title         text NOT NULL,
  url           text NOT NULL DEFAULT '',
  agency        text NOT NULL DEFAULT '',
  summary       text NOT NULL DEFAULT '',
  target        text NOT NULL DEFAULT '',
  support_types text[] NOT NULL DEFAULT '{}',
  regions       text[] NOT NULL DEFAULT '{}',
  industries    text[] NOT NULL DEFAULT '{}',
  apply_start   date,
  apply_end     date,
  collected_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS announcements_apply_end_idx ON announcements (apply_end);
CREATE TABLE IF NOT EXISTS collect_runs (
  id          bigserial PRIMARY KEY,
  source      text NOT NULL,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status      text NOT NULL,
  fetched     int NOT NULL DEFAULT 0,
  added       int NOT NULL DEFAULT 0,
  error       text
);
CREATE TABLE IF NOT EXISTS sent_announcements (
  email           text NOT NULL REFERENCES subscribers(email) ON DELETE CASCADE,
  announcement_id text NOT NULL,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (email, announcement_id)
);
`;

type G = typeof globalThis & {__pool?: Pool; __schema?: Promise<void>};
const g = globalThis as G;

function pool(): Pool {
  if (!g.__pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set (a Postgres connection string, e.g. from Supabase or Neon)');
    // Small pool: serverless functions each hold their own.
    g.__pool = new Pool({connectionString: url, max: 5, idleTimeoutMillis: 10_000});
  }
  return g.__pool;
}

async function ready(): Promise<Pool> {
  const p = pool();
  // Idempotent; run once per process. A failed attempt is retried on the next call.
  g.__schema ??= p.query(SCHEMA).then(() => undefined);
  try {
    await g.__schema;
  } catch (e) {
    g.__schema = undefined;
    throw e;
  }
  return p;
}

export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const p = await ready();
  return (await p.query(sql, params)).rows as T[];
}

export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const p = await ready();
  const c = await p.connect();
  try {
    await c.query('BEGIN');
    const out = await fn(c);
    await c.query('COMMIT');
    return out;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}

/** For tests/scripts: close the pool. */
export async function closeDb() {
  await g.__pool?.end();
  g.__pool = undefined;
  g.__schema = undefined;
}
