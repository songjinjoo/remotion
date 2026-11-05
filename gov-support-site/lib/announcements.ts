import {promises as fs} from 'fs';
import path from 'path';

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

// MVP storage (see lib/store.ts note): local JSON file.
const FILE = path.join(process.cwd(), 'data', 'announcements.json');

export async function readAnnouncements(): Promise<Announcement[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8')) as Announcement[];
  } catch {
    return [];
  }
}

/** Merge by id (new data wins). Returns number of newly added items. */
export async function saveAnnouncements(incoming: Announcement[]): Promise<{added: number; total: number}> {
  const existing = await readAnnouncements();
  const map = new Map(existing.map((a) => [a.id, a]));
  let added = 0;
  for (const a of incoming) {
    if (!map.has(a.id)) added++;
    map.set(a.id, a);
  }
  const all = [...map.values()];
  await fs.mkdir(path.dirname(FILE), {recursive: true});
  await fs.writeFile(FILE, JSON.stringify(all, null, 2));
  return {added, total: all.length};
}
