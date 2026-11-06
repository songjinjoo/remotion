// Run once with a real key to verify the response format the collector assumes:
//   BIZINFO_API_KEY=... npm run probe:bizinfo
import {FIELD_ALIASES, fetchBizinfoPage, normalizeBizinfo} from '../lib/sources/bizinfo';

async function main() {
  const key = process.env.BIZINFO_API_KEY;
  if (!key) throw new Error('BIZINFO_API_KEY is not set');
  const p1 = await fetchBizinfoPage(key, 1, 5);
  const p2 = await fetchBizinfoPage(key, 2, 5);
  console.log(`page1: ${p1.length} items, page2: ${p2.length} items`);
  if (!p1.length) throw new Error('empty response — check the key / response format');
  const keys = new Set(p1.flatMap((i) => Object.keys(i)));
  console.log('fields in response:', [...keys].sort().join(', '));

  let bad = false;
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const found = aliases.filter((a) => keys.has(a));
    const required = ['id', 'title'].includes(field);
    if (!found.length) {
      console.log(`${required ? 'MISSING (required)' : 'missing'}: ${field} (tried ${aliases.join(', ')})`);
      if (required) bad = true;
    } else console.log(`ok: ${field} <- ${found.join(', ')}`);
  }
  const first = (x: typeof p1) => String(x[0]?.pblancId ?? x[0]?.seq ?? x[0]?.title ?? '');
  const repeats = p2.length > 0 && first(p1) === first(p2);
  console.log(repeats ? 'WARNING: page 2 repeats page 1 — pageUnit/pageIndex are not honored' : 'paging OK');
  console.log('first item normalized:\n', JSON.stringify(normalizeBizinfo(p1[0]), null, 2));
  if (bad || repeats) process.exit(2);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
