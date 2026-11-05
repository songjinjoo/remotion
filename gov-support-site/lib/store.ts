import {promises as fs} from 'fs';
import path from 'path';

export type Subscriber = {
  email: string;
  industries: string[];
  regions: string[];
  supportTypes: string[];
  stage: string;
  frequency: string;
  createdAt: string;
};

// MVP storage: a local JSON file. Replace with a real DB before production
// (serverless hosts have read-only/ephemeral filesystems).
const FILE = path.join(process.cwd(), 'data', 'subscribers.json');

async function readAll(): Promise<Subscriber[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8')) as Subscriber[];
  } catch {
    return [];
  }
}

export async function upsertSubscriber(sub: Subscriber): Promise<'created' | 'updated'> {
  const all = await readAll();
  const idx = all.findIndex((s) => s.email === sub.email);
  if (idx >= 0) all[idx] = {...sub, createdAt: all[idx].createdAt};
  else all.push(sub);
  await fs.mkdir(path.dirname(FILE), {recursive: true});
  await fs.writeFile(FILE, JSON.stringify(all, null, 2));
  return idx >= 0 ? 'updated' : 'created';
}
