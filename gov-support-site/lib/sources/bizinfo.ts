import type {Announcement} from '../announcements';
import {
  classifyIndustries,
  classifyRegions,
  classifySupportTypes,
  parsePeriod,
  stripHtml,
} from '../normalize';

/**
 * 기업마당(bizinfo.go.kr) 지원사업정보 API.
 * Key: https://www.bizinfo.go.kr/apiList.do (정책정보 개방) → 지원사업정보 API 사용 신청 → env BIZINFO_API_KEY.
 * Field names follow the public API docs; verify against a live response once a key is available.
 */
const ENDPOINT = 'https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do';

/**
 * The docs list RSS-style field names (title, seq, link, reqstDt, author, lcategory) while the field names
 * I first assumed for JSON were pblancNm/pblancId/… . Accept both; `probe:bizinfo` shows which the live API uses.
 */
export const FIELD_ALIASES = {
  id: ['pblancId', 'seq'],
  title: ['pblancNm', 'title'],
  url: ['pblancUrl', 'link'],
  agency: ['jrsdInsttNm', 'author'],
  executor: ['excInsttNm'],
  period: ['reqstBeginEndDe', 'reqstDt'],
  category: ['pldirSportRealmLclasCodeNm', 'lcategory'],
  hashtags: ['hashtags'],
  summary: ['bsnsSumryCn', 'description'],
  target: ['trgetNm'],
} as const;

export type BizinfoItem = Record<string, unknown>;

const pick = (item: BizinfoItem, field: keyof typeof FIELD_ALIASES): string => {
  for (const key of FIELD_ALIASES[field]) {
    const v = item[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return '';
};

export function normalizeBizinfo(item: BizinfoItem, collectedAt = new Date().toISOString()): Announcement | null {
  const id = pick(item, 'id');
  const title = pick(item, 'title');
  if (!id || !title) return null;
  const summary = stripHtml(pick(item, 'summary'));
  const category = pick(item, 'category');
  const hashtags = pick(item, 'hashtags');
  const target = pick(item, 'target');
  const agency = pick(item, 'agency');
  const executor = pick(item, 'executor');
  const period = parsePeriod(pick(item, 'period'));
  const url = pick(item, 'url');
  return {
    id: `bizinfo:${id}`,
    source: 'bizinfo',
    title,
    url: url.startsWith('http') ? url : url ? `https://www.bizinfo.go.kr${url.startsWith('/') ? '' : '/'}${url}` : '',
    agency: agency || executor,
    summary: summary.slice(0, 400),
    target,
    supportTypes: classifySupportTypes(`${category} ${title} ${hashtags}`),
    regions: classifyRegions(`${agency} ${executor} ${title} ${hashtags}`),
    industries: classifyIndustries([title, category, hashtags, summary, target].join(' ')),
    applyStart: period.start,
    applyEnd: period.end,
    collectedAt,
  };
}

type Page = {jsonArray?: BizinfoItem[] | BizinfoItem; reqErr?: string};

export async function fetchBizinfoPage(apiKey: string, pageIndex: number, pageUnit: number, fetchImpl: typeof fetch = fetch): Promise<BizinfoItem[]> {
  const url = `${ENDPOINT}?crtfcKey=${encodeURIComponent(apiKey)}&dataType=json&pageUnit=${pageUnit}&pageIndex=${pageIndex}&searchCnt=${pageUnit}`;
  const res = await fetchImpl(url, {signal: AbortSignal.timeout(20_000)});
  if (!res.ok) throw new Error(`bizinfo HTTP ${res.status}`);
  const body = await res.text();
  let data: Page;
  try {
    data = JSON.parse(body) as Page;
  } catch {
    // Errors/maintenance/blocked requests usually come back as HTML or XML.
    throw new Error(`bizinfo returned non-JSON: ${body.replace(/\s+/g, ' ').slice(0, 120)}`);
  }
  if (data.reqErr) throw new Error(`bizinfo error: ${data.reqErr}`);
  const arr = data.jsonArray;
  return Array.isArray(arr) ? arr : arr ? [arr] : [];
}

/**
 * Fetches up to `maxPages` pages. Stops early on a short page, or when a page adds no new
 * ids (guards against the API ignoring the paging parameters and repeating page 1).
 */
export async function fetchBizinfo(
  apiKey: string,
  opts: {pageUnit?: number; maxPages?: number; fetchImpl?: typeof fetch} = {},
): Promise<Announcement[]> {
  const {pageUnit = 100, maxPages = 5, fetchImpl = fetch} = opts;
  const seen = new Map<string, Announcement>();
  const now = new Date().toISOString();
  for (let page = 1; page <= maxPages; page++) {
    const items = await fetchBizinfoPage(apiKey, page, pageUnit, fetchImpl);
    const before = seen.size;
    for (const item of items) {
      const a = normalizeBizinfo(item, now);
      if (a) seen.set(a.id, a);
    }
    if (items.length < pageUnit || seen.size === before) break;
  }
  return [...seen.values()];
}
