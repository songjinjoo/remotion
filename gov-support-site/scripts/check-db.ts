// Needs DATABASE_URL pointing at a throwaway Postgres: DATABASE_URL=postgres://... npm run check:db
import assert from 'node:assert/strict';
import {closeDb, query, tx} from '../lib/db';
import {deleteAnnouncement, readAnnouncements, saveAnnouncements, type Announcement} from '../lib/announcements';
import {markSent, readSubscribers, removeSubscriber, upsertSubscriber, type Subscriber} from '../lib/store';

const P = 'dbtest-' + Date.now();
const mk = (n: string, o: Partial<Announcement> = {}): Announcement => ({
  id: `${P}:${n}`, source: 'manual', title: `제목 "${n}", with 'quotes'`, url: 'https://a.kr/' + n, agency: '기관', summary: '요약',
  target: '대상', supportTypes: ['R&D', '자금·융자'], regions: ['서울'], industries: [], applyStart: '2026-12-01',
  applyEnd: '2026-12-31', collectedAt: '2026-11-06T00:00:00.000Z', ...o,
});
const sub = (o: Partial<Subscriber> = {}): Subscriber => ({
  email: `${P}@x.co`, industries: ['IT·소프트웨어'], regions: ['서울', '경기'], supportTypes: ['R&D'], keywords: ['배터리', 'a,b'],
  stage: '예비창업자', frequency: '매일', createdAt: '', ...o,
});

async function main() {
  // concurrent first use must not race on schema creation
  await Promise.all([query('SELECT 1'), query('SELECT 1'), query('SELECT 1')]);

  // --- subscribers ---
  assert.equal(await upsertSubscriber(sub()), 'created');
  const first = (await readSubscribers()).find((s) => s.email === sub().email)!;
  assert.deepEqual(first.regions, ['서울', '경기']);
  assert.deepEqual(first.keywords, ['배터리', 'a,b']);
  assert.deepEqual(first.sentIds, []);
  assert.equal(await upsertSubscriber(sub({frequency: '주 1회', regions: ['부산']})), 'updated');
  const second = (await readSubscribers()).find((s) => s.email === sub().email)!;
  assert.equal(second.frequency, '주 1회');
  assert.deepEqual(second.regions, ['부산']);
  assert.equal(second.createdAt, first.createdAt, 'created_at preserved on update');

  // --- announcements ---
  const r1 = await saveAnnouncements([mk('a'), mk('b', {applyEnd: null, applyStart: null}), mk('a')]);
  assert.equal(r1.added, 2, 'duplicate id in one batch counted once');
  const r2 = await saveAnnouncements([mk('a', {title: 'changed'}), mk('c', {applyEnd: '2026-01-01'})]);
  assert.equal(r2.added, 1, 'only c is new');
  const all = (await readAnnouncements()).filter((a) => a.id.startsWith(P));
  assert.equal(all.length, 3);
  const a = all.find((x) => x.id === `${P}:a`)!;
  assert.equal(a.title, 'changed');
  assert.equal(a.applyStart, '2026-12-01', 'date has no timezone shift');
  assert.equal(a.applyEnd, '2026-12-31');
  assert.deepEqual(a.supportTypes, ['R&D', '자금·융자']);
  assert.equal(all.find((x) => x.id === `${P}:b`)!.applyEnd, null);
  const open = (await readAnnouncements({openOn: '2026-11-06'})).filter((x) => x.id.startsWith(P)).map((x) => x.id.split(':')[1]).sort();
  assert.deepEqual(open, ['a', 'b'], 'closed announcement filtered; 상시 kept');
  assert.equal(
    (await readAnnouncements({openOn: '2026-12-31'})).filter((x) => x.id.startsWith(P)).length, 2, 'apply_end day itself is still open');

  // --- sent tracking ---
  await markSent(sub().email, [`${P}:a`, `${P}:b`]);
  await markSent(sub().email, [`${P}:b`]); // idempotent
  const sent = (await readSubscribers()).find((s) => s.email === sub().email)!;
  assert.deepEqual([...sent.sentIds!].sort(), [`${P}:a`, `${P}:b`]);
  assert.ok(sent.lastSentAt);

  // --- transaction rollback ---
  await assert.rejects(tx(async (c) => {
    await c.query("INSERT INTO announcements (id, source, title) VALUES ($1,'x','t')", [`${P}:rollback`]);
    throw new Error('boom');
  }), /boom/);
  assert.equal((await query('SELECT 1 FROM announcements WHERE id = $1', [`${P}:rollback`])).length, 0);

  // --- delete + cascade ---
  assert.equal(await deleteAnnouncement(`${P}:a`), true);
  assert.equal(await deleteAnnouncement(`${P}:a`), false);
  assert.equal(await removeSubscriber(sub().email), true);
  assert.equal(await removeSubscriber(sub().email), false);
  assert.equal((await query('SELECT 1 FROM sent_announcements WHERE email = $1', [sub().email])).length, 0, 'cascade');
  console.log('db ok');
}

main()
  .finally(async () => {
    await query('DELETE FROM announcements WHERE id LIKE $1', [P + '%']).catch(() => undefined);
    await closeDb();
  })
  .catch((e) => { console.error(e); process.exit(1); });
