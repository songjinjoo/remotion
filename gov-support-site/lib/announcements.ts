import {query, tx} from './db';

export type Announcement = {
  id: string; // `${source}:${sourceId}`
  source: string;
  title: string;
  url: string;
  agency: string;
  summary: string;
  target: string;
  /** Normalized to values from SUPPORT_TYPES */
  supportTypes: string[];
  /** Normalized to values from REGIONS ('전국' when not region-specific) */
  regions: string[];
  /** Normalized to values from INDUSTRIES; empty = all industries */
  industries: string[];
  applyStart: string | null; // YYYY-MM-DD
  applyEnd: string | null; // YYYY-MM-DD, null = 상시/미정
  collectedAt: string;
};

type Row = {
  id: string; source: string; title: string; url: string; agency: string; summary: string; target: string;
  support_types: string[]; regions: string[]; industries: string[];
  apply_start: string | null; apply_end: string | null; collected_at: Date;
};

const fromRow = (r: Row): Announcement => ({
  id: r.id, source: r.source, title: r.title, url: r.url, agency: r.agency, summary: r.summary, target: r.target,
  supportTypes: r.support_types, regions: r.regions, industries: r.industries,
  applyStart: r.apply_start, applyEnd: r.apply_end, collectedAt: r.collected_at.toISOString(),
});

/** `openOn` (YYYY-MM-DD): only announcements still open on that date (상시/미정 included). */
export async function readAnnouncements(opts: {openOn?: string} = {}): Promise<Announcement[]> {
  const rows = opts.openOn
    ? await query<Row>('SELECT * FROM announcements WHERE apply_end IS NULL OR apply_end >= $1 ORDER BY apply_end NULLS LAST', [opts.openOn])
    : await query<Row>('SELECT * FROM announcements ORDER BY apply_end NULLS LAST, collected_at DESC');
  return rows.map(fromRow);
}

/** Upsert by id (new data wins). Returns number of newly added items and the table total. */
export async function saveAnnouncements(incoming: Announcement[]): Promise<{added: number; total: number}> {
  // De-duplicate within the batch so one id can't be counted twice.
  const unique = [...new Map(incoming.map((a) => [a.id, a])).values()];
  return tx(async (c) => {
    let added = 0;
    for (const a of unique) {
      const r = await c.query(
        `INSERT INTO announcements (id, source, title, url, agency, summary, target, support_types, regions, industries, apply_start, apply_end, collected_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO UPDATE SET
           source=EXCLUDED.source, title=EXCLUDED.title, url=EXCLUDED.url, agency=EXCLUDED.agency, summary=EXCLUDED.summary,
           target=EXCLUDED.target, support_types=EXCLUDED.support_types, regions=EXCLUDED.regions, industries=EXCLUDED.industries,
           apply_start=EXCLUDED.apply_start, apply_end=EXCLUDED.apply_end, collected_at=EXCLUDED.collected_at
         RETURNING (xmax = 0) AS inserted`,
        [a.id, a.source, a.title, a.url, a.agency, a.summary, a.target, a.supportTypes, a.regions, a.industries,
         a.applyStart, a.applyEnd, a.collectedAt || new Date().toISOString()],
      );
      if (r.rows[0].inserted) added++;
    }
    const total = Number((await c.query('SELECT count(*) FROM announcements')).rows[0].count);
    return {added, total};
  });
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  return (await query('DELETE FROM announcements WHERE id = $1 RETURNING id', [id])).length > 0;
}
