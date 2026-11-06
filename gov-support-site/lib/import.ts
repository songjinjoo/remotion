import {createHash} from 'crypto';
import type {Announcement} from './announcements';
import {INDUSTRIES, REGIONS, SUPPORT_TYPES} from './options';
import {classifyIndustries, classifyRegions, classifySupportTypes, stripHtml} from './normalize';

/** Minimal RFC4180 CSV parser (quotes, escaped quotes, newlines in cells). Handles TSV pasted from sheets. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const delim = (src.split('\n', 1)[0].match(/\t/g)?.length ?? 0) > 0 ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

const HEADERS: Record<string, string> = {
  제목: 'title', 공고명: 'title', title: 'title',
  링크: 'url', url: 'url', 주소: 'url',
  기관: 'agency', 소관기관: 'agency', agency: 'agency',
  요약: 'summary', 내용: 'summary', summary: 'summary',
  지원대상: 'target', 대상: 'target', target: 'target',
  지원분야: 'supportTypes', 분야: 'supportTypes', supportTypes: 'supportTypes',
  지역: 'regions', regions: 'regions',
  업종: 'industries', industries: 'industries',
  신청시작: 'applyStart', 시작일: 'applyStart', applyStart: 'applyStart',
  신청종료: 'applyEnd', 마감일: 'applyEnd', 종료일: 'applyEnd', applyEnd: 'applyEnd',
};

export type RawRow = Record<string, unknown>;

export function csvToRows(text: string): RawRow[] {
  const [head, ...body] = parseCsv(text);
  if (!head) return [];
  const keys = head.map((h) => HEADERS[h.trim()] ?? '');
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i]?.trim() ?? '']).filter(([k]) => k)));
}

const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String) : typeof v === 'string' ? v.split(/[,;|]/).map((s) => s.trim()).filter(Boolean) : [];

/** Keep only allowed values; if none given, fall back to auto-classification. */
const pickOr = (given: string[], allowed: readonly string[], auto: string[]) => {
  const ok = given.filter((g) => allowed.includes(g));
  return ok.length ? ok : auto;
};

/** Accepts 2026-11-30, 2026.11.30, 20261130, 2026/11/30. */
export function parseDate(v: unknown): string | null {
  const m = String(v ?? '').match(/(\d{4})\D?(\d{1,2})\D?(\d{1,2})/);
  if (!m) return null;
  const [y, mo, d] = [m[1], m[2].padStart(2, '0'), m[3].padStart(2, '0')];
  const date = new Date(`${y}-${mo}-${d}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== `${y}-${mo}-${d}` ? null : `${y}-${mo}-${d}`;
}

export function toAnnouncement(raw: RawRow, collectedAt = new Date().toISOString()): Announcement | {error: string} {
  const s = (k: string) => String(raw[k] ?? '').trim();
  const title = s('title');
  if (!title) return {error: '제목이 없습니다.'};
  const url = s('url');
  if (url && !/^https?:\/\//i.test(url)) return {error: `링크는 http(s)로 시작해야 합니다: ${url}`};
  const summary = stripHtml(s('summary')).slice(0, 400);
  const agency = s('agency');
  const text = `${title} ${agency} ${summary} ${s('target')}`;
  const id = 'manual:' + createHash('sha1').update(url || title).digest('hex').slice(0, 16);
  return {
    id, source: 'manual', title, url, agency, summary, target: s('target'),
    supportTypes: pickOr(list(raw.supportTypes), SUPPORT_TYPES, classifySupportTypes(text)),
    regions: pickOr(list(raw.regions), REGIONS, classifyRegions(`${agency} ${title}`)),
    industries: pickOr(list(raw.industries), INDUSTRIES, classifyIndustries(text)),
    applyStart: parseDate(raw.applyStart),
    applyEnd: parseDate(raw.applyEnd),
    collectedAt,
  };
}

export function importRows(rows: RawRow[]) {
  const items: Announcement[] = [];
  const errors: string[] = [];
  rows.forEach((r, i) => {
    const res = toAnnouncement(r);
    if ('error' in res) errors.push(`${i + 1}번째 행: ${res.error}`);
    else items.push(res);
  });
  return {items, errors};
}
