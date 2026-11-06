import {query} from './db';

export type CollectRun = {
  id: number; source: string; startedAt: string; finishedAt: string | null;
  status: 'ok' | 'empty' | 'error' | 'skipped'; fetched: number; added: number; error: string | null;
};

export async function recordRun(r: {source: string; startedAt: Date; status: CollectRun['status']; fetched?: number; added?: number; error?: string}) {
  await query(
    `INSERT INTO collect_runs (source, started_at, finished_at, status, fetched, added, error) VALUES ($1,$2,now(),$3,$4,$5,$6)`,
    [r.source, r.startedAt.toISOString(), r.status, r.fetched ?? 0, r.added ?? 0, r.error?.slice(0, 500) ?? null],
  );
}

export async function recentRuns(limit = 10): Promise<CollectRun[]> {
  const rows = await query<{id: string; source: string; started_at: Date; finished_at: Date | null; status: CollectRun['status']; fetched: number; added: number; error: string | null}>(
    'SELECT * FROM collect_runs ORDER BY id DESC LIMIT $1', [limit]);
  return rows.map((r) => ({
    id: Number(r.id), source: r.source, startedAt: r.started_at.toISOString(), finishedAt: r.finished_at?.toISOString() ?? null,
    status: r.status, fetched: r.fetched, added: r.added, error: r.error,
  }));
}
