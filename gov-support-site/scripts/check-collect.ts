import assert from 'node:assert/strict';
import fixture from '../data/fixtures/bizinfo-sample.json';
import {normalizeBizinfo, type BizinfoItem} from '../lib/sources/bizinfo';
import {selectFor} from '../lib/match';
import type {Subscriber} from '../lib/store';

const items = (fixture.jsonArray as BizinfoItem[])
  .map((i) => normalizeBizinfo(i, '2026-11-05T00:00:00Z'))
  .filter((a) => a !== null);
assert.equal(items.length, 3, 'item without id is dropped');

const [seoul, smart, gyeongnam] = items;
assert.deepEqual(seoul.regions, ['서울']);
assert.ok(seoul.supportTypes.includes('창업지원'));
assert.ok(seoul.industries.includes('IT·소프트웨어'));
assert.equal(seoul.applyEnd, '2026-11-30');
assert.ok(seoul.url.startsWith('https://www.bizinfo.go.kr/'));
assert.deepEqual(smart.regions, ['전국']);
assert.deepEqual(gyeongnam.regions, ['경상']);
assert.equal(gyeongnam.applyEnd, null);

const sub = (o: Partial<Subscriber>): Subscriber => ({
  email: 'a@b.co', industries: [], regions: ['서울'], supportTypes: ['창업지원'],
  stage: '', frequency: '', createdAt: '', ...o,
});
const now = '2026-11-05';
assert.deepEqual(selectFor(sub({}), items, now).map((a) => a.id), ['bizinfo:PBLN_000000000000001']);
// 스마트공장 공고는 마감(10/15) → 제외
assert.equal(selectFor(sub({supportTypes: ['R&D'], regions: ['전국']}), items, now).length, 0);
// 경남 융자: 상시 → 경상 + 자금·융자 구독자에게 매칭
assert.equal(selectFor(sub({regions: ['경상'], supportTypes: ['자금·융자']}), items, now).length, 1);
console.log('ok');
