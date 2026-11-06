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

// --- manual import ---
import {csvToRows, importRows, parseDate} from '../lib/import';
const csv = '﻿제목,링크,기관,요약,지원분야,지역,업종,신청시작,신청종료\n' +
  '"쉼표, 포함 ""제목""",https://a.kr/1,부산광역시,"여러\n줄",자금·융자,,,2026.11.01,2026/12/31\n' +
  ',https://a.kr/2,,,,,,,\n' +
  '링크오류,ftp://x,,,,,,,\n' +
  '서울 R&D 지원,,서울특별시,AI 기술개발,,,,,20261201\n';
const res = importRows(csvToRows(csv));
assert.equal(res.items.length, 2);
assert.equal(res.errors.length, 2);
assert.equal(res.items[0].title, '쉼표, 포함 "제목"');
assert.deepEqual(res.items[0].supportTypes, ['자금·융자']);
assert.deepEqual(res.items[0].regions, ['부산']); // auto from agency
assert.equal(res.items[0].applyStart, '2026-11-01');
assert.equal(res.items[0].applyEnd, '2026-12-31');
assert.deepEqual(res.items[1].regions, ['서울']);
assert.ok(res.items[1].supportTypes.includes('R&D'));
assert.equal(res.items[1].applyEnd, '2026-12-01');
assert.equal(parseDate('2026-02-30'), null);
// TSV (copied from a spreadsheet)
assert.equal(csvToRows('제목\t링크\n공고\thttps://a.kr').length, 1);
console.log('import ok');
