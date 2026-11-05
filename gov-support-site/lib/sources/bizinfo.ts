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
 * Key: https://www.bizinfo.go.kr → 정책정보 → 지원사업정보 API 신청 (env BIZINFO_API_KEY).
 * Field names follow the public API docs; verify against a live response once a key is available.
 */
const ENDPOINT = 'https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do';

export type BizinfoItem = {
  pblancId?: string;
  pblancNm?: string;
  pblancUrl?: string;
  jrsdInsttNm?: string; // 소관기관
  excInsttNm?: string; // 수행기관
  reqstBeginEndDe?: string; // "YYYYMMDD ~ YYYYMMDD"
  pldirSportRealmLclasCodeNm?: string; // 분야 (금융/기술/인력/수출/내수/창업/경영/기타)
  hashtags?: string;
  bsnsSumryCn?: string;
  trgetNm?: string;
};

export function normalizeBizinfo(item: BizinfoItem, collectedAt = new Date().toISOString()): Announcement | null {
  if (!item.pblancId || !item.pblancNm) return null;
  const summary = stripHtml(item.bsnsSumryCn);
  const text = [item.pblancNm, item.pldirSportRealmLclasCodeNm, item.hashtags, summary, item.trgetNm].join(' ');
  const period = parsePeriod(item.reqstBeginEndDe);
  const url = item.pblancUrl ?? '';
  return {
    id: `bizinfo:${item.pblancId}`,
    source: 'bizinfo',
    title: item.pblancNm.trim(),
    url: url.startsWith('http') ? url : url ? `https://www.bizinfo.go.kr${url}` : '',
    agency: item.jrsdInsttNm ?? item.excInsttNm ?? '',
    summary: summary.slice(0, 400),
    target: item.trgetNm ?? '',
    supportTypes: classifySupportTypes(`${item.pldirSportRealmLclasCodeNm ?? ''} ${item.pblancNm} ${item.hashtags ?? ''}`),
    regions: classifyRegions(`${item.jrsdInsttNm ?? ''} ${item.excInsttNm ?? ''} ${item.pblancNm} ${item.hashtags ?? ''}`),
    industries: classifyIndustries(text),
    applyStart: period.start,
    applyEnd: period.end,
    collectedAt,
  };
}

export async function fetchBizinfo(apiKey: string, count = 100): Promise<Announcement[]> {
  const url = `${ENDPOINT}?crtfcKey=${encodeURIComponent(apiKey)}&dataType=json&searchCnt=${count}`;
  const res = await fetch(url, {signal: AbortSignal.timeout(20_000)});
  if (!res.ok) throw new Error(`bizinfo HTTP ${res.status}`);
  const data = (await res.json()) as {jsonArray?: BizinfoItem[]; reqErr?: string};
  if (data.reqErr) throw new Error(`bizinfo error: ${data.reqErr}`);
  const now = new Date().toISOString();
  return (data.jsonArray ?? []).map((i) => normalizeBizinfo(i, now)).filter((a): a is Announcement => a !== null);
}
