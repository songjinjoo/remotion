import {promises as fs} from 'fs';
import path from 'path';

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

// MVP storage: a local JSON file. Replace with a real DB before production
// (serverless hosts have read-only/ephemeral filesystems).
const FILE = path.join(process.cwd(), 'data', 'subscribers.json');

export async function readSubscribers(): Promise<Subscriber[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8')) as Subscriber[];
  } catch {
    return [];
  }
}

async function writeAll(all: Subscriber[]) {
  await fs.mkdir(path.dirname(FILE), {recursive: true});
  await fs.writeFile(FILE, JSON.stringify(all, null, 2));
}

export async function upsertSubscriber(sub: Subscriber): Promise<'created' | 'updated'> {
  const all = await readSubscribers();
  const idx = all.findIndex((s) => s.email === sub.email);
  if (idx >= 0) all[idx] = {...all[idx], ...sub, createdAt: all[idx].createdAt};
  else all.push(sub);
  await writeAll(all);
  return idx >= 0 ? 'updated' : 'created';
}

export async function markSent(email: string, ids: string[], at = new Date().toISOString()) {
  const all = await readSubscribers();
  const s = all.find((x) => x.email === email);
  if (!s) return;
  s.sentIds = [...new Set([...(s.sentIds ?? []), ...ids])].slice(-2000);
  s.lastSentAt = at;
  await writeAll(all);
}

export async function removeSubscriber(email: string): Promise<boolean> {
  const all = await readSubscribers();
  const next = all.filter((s) => s.email !== email);
  if (next.length === all.length) return false;
  await writeAll(next);
  return true;
}
