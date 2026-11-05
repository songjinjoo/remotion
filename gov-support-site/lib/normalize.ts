import {INDUSTRIES, REGIONS, SUPPORT_TYPES} from './options';

type Rule<T extends string> = [T, RegExp];

const SUPPORT_RULES: Rule<(typeof SUPPORT_TYPES)[number]>[] = [
  ['창업지원', /창업|스타트업|예비창업|초기기업/],
  ['자금·융자', /금융|융자|대출|보증|자금|투자|이차보전/],
  ['R&D', /R&D|기술개발|연구개발|기술|특허|사업화/i],
  ['수출·마케팅', /수출|해외|판로|마케팅|내수|홍보|전시회/],
  ['고용·인건비', /인력|고용|채용|인건비|일자리/],
  ['교육·컨설팅', /교육|컨설팅|경영|멘토링|코칭|세미나/],
  ['시설·공간', /시설|공간|입주|보육|오피스|공장|임대/],
];

const INDUSTRY_RULES: Rule<(typeof INDUSTRIES)[number]>[] = [
  ['제조업', /제조|뿌리산업|소재|부품|공정|스마트공장/],
  ['IT·소프트웨어', /IT|소프트웨어|SW|AI|인공지능|데이터|플랫폼|클라우드|ICT/],
  ['도소매·유통', /도소매|유통|이커머스|전통시장|소상공인/],
  ['음식·외식', /음식|외식|식당|요식/],
  ['농림수산', /농업|농림|수산|어업|축산|식품/],
  ['콘텐츠·문화', /콘텐츠|문화|게임|영상|관광|예술|웹툰/],
  ['바이오·헬스', /바이오|헬스|의료|제약|의약|화장품/],
  ['서비스업', /서비스업|컨설팅업|물류|운송/],
];

const REGION_ALIASES: Record<string, (typeof REGIONS)[number]> = {
  서울: '서울', 경기: '경기', 인천: '인천', 부산: '부산', 대구: '대구', 광주: '광주',
  대전: '대전', 울산: '울산', 세종: '세종', 강원: '강원', 제주: '제주',
  충북: '충청', 충남: '충청', 충청: '충청',
  전북: '전라', 전남: '전라', 전라: '전라',
  경북: '경상', 경남: '경상', 경상: '경상',
};

function matchAll<T extends string>(rules: Rule<T>[], text: string): T[] {
  return rules.filter(([, re]) => re.test(text)).map(([v]) => v);
}

export const classifySupportTypes = (text: string) => matchAll(SUPPORT_RULES, text);
export const classifyIndustries = (text: string) => matchAll(INDUSTRY_RULES, text);

/** Region from the issuing agency / title. Defaults to '전국'. */
export function classifyRegions(text: string): string[] {
  const found = new Set<string>();
  for (const [alias, region] of Object.entries(REGION_ALIASES)) {
    if (text.includes(alias)) found.add(region);
  }
  return found.size ? [...found] : ['전국'];
}

const ymd = (s: string) =>
  /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null;

/** Parses "20241101 ~ 20241130"; anything else (상시, 예산 소진시 …) → nulls. */
export function parsePeriod(raw: string | undefined): {start: string | null; end: string | null} {
  const m = (raw ?? '').match(/(\d{8})\s*~\s*(\d{8})/);
  return m ? {start: ymd(m[1]), end: ymd(m[2])} : {start: null, end: null};
}

export const stripHtml = (s: string | undefined) =>
  (s ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
