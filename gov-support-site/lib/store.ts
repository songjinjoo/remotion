import {query, tx} from './db';

export type Subscriber = {
  email: string;
  industries: string[];
  regions: string[];
  supportTypes: string[];
  /** Free-text interests (e.g. "배터리 소재", "스마트팜"); used to rank announcements. */
  keywords?: string[];
  stage: string;
  frequency: string;
  createdAt: string;
  /** Announcement ids already emailed, so each mail only has new items. */
  sentIds?: string[];
  lastSentAt?: string;
};

type Row = {
  email: string; industries: string[]; regions: string[]; support_types: string[]; keywords: string[];
  stage: string; frequency: string; created_at: Date; last_sent_at: Date | null; sent_ids: string[];
};

export async function readSubscribers(): Promise<Subscriber[]> {
  const rows = await query<Row>(`
    SELECT s.*, COALESCE(array_agg(a.announcement_id) FILTER (WHERE a.announcement_id IS NOT NULL), '{}') AS sent_ids
    FROM subscribers s LEFT JOIN sent_announcements a ON a.email = s.email
    GROUP BY s.email ORDER BY s.created_at`);
  return rows.map((r) => ({
    email: r.email,
    industries: r.industries,
    regions: r.regions,
    supportTypes: r.support_types,
    keywords: r.keywords,
    stage: r.stage,
    frequency: r.frequency,
    createdAt: r.created_at.toISOString(),
    sentIds: r.sent_ids,
    lastSentAt: r.last_sent_at?.toISOString(),
  }));
}

export async function upsertSubscriber(sub: Subscriber): Promise<'created' | 'updated'> {
  const [row] = await query<{inserted: boolean}>(
    `INSERT INTO subscribers (email, industries, regions, support_types, keywords, stage, frequency)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (email) DO UPDATE SET
       industries = EXCLUDED.industries, regions = EXCLUDED.regions, support_types = EXCLUDED.support_types,
       keywords = EXCLUDED.keywords, stage = EXCLUDED.stage, frequency = EXCLUDED.frequency
     RETURNING (xmax = 0) AS inserted`,
    [sub.email, sub.industries, sub.regions, sub.supportTypes, sub.keywords ?? [], sub.stage, sub.frequency],
  );
  return row.inserted ? 'created' : 'updated';
}

export async function markSent(email: string, ids: string[], at = new Date().toISOString()) {
  await tx(async (c) => {
    if (ids.length) {
      await c.query(
        `INSERT INTO sent_announcements (email, announcement_id, sent_at)
         SELECT $1, unnest($2::text[]), $3 ON CONFLICT DO NOTHING`,
        [email, ids, at],
      );
    }
    await c.query('UPDATE subscribers SET last_sent_at = $2 WHERE email = $1', [email, at]);
  });
}

export async function removeSubscriber(email: string): Promise<boolean> {
  const rows = await query('DELETE FROM subscribers WHERE email = $1 RETURNING email', [email]);
  return rows.length > 0;
}
