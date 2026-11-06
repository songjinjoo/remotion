// One-off: import data/subscribers.json and data/announcements.json (from the pre-DB version) into Postgres.
// Usage: DATABASE_URL=... npm run migrate:json
import {promises as fs} from 'fs';
import path from 'path';
import {closeDb, query} from '../lib/db';
import {saveAnnouncements, type Announcement} from '../lib/announcements';
import {markSent, upsertSubscriber, type Subscriber} from '../lib/store';

const read = async <T>(f: string): Promise<T[]> => {
  try {
    return JSON.parse(await fs.readFile(path.join(process.cwd(), 'data', f), 'utf8'));
  } catch {
    return [];
  }
};

async function main() {
  const anns = await read<Announcement>('announcements.json');
  const subs = await read<Subscriber>('subscribers.json');
  if (anns.length) console.log('announcements:', await saveAnnouncements(anns));
  for (const s of subs) {
    await upsertSubscriber(s);
    if (s.sentIds?.length) await markSent(s.email, s.sentIds, s.lastSentAt);
    if (s.createdAt) await query('UPDATE subscribers SET created_at = $2 WHERE email = $1', [s.email, s.createdAt]);
  }
  console.log(`subscribers: ${subs.length}`);
}

main().finally(closeDb).catch((e) => { console.error(e); process.exit(1); });
