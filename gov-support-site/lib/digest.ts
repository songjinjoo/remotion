import type {Announcement} from './announcements';
import {selectFor} from './match';
import type {Subscriber} from './store';

const MAX_ITEMS = 20;
const UPCOMING_DAYS = 60;

/** Current date/time shifted to Korea (KST, UTC+9) — the digest's "today". */
export const kstNow = (d = new Date()) => new Date(d.getTime() + 9 * 3600_000);
export const kstToday = (d = new Date()) => kstNow(d).toISOString().slice(0, 10);

const addDays = (ymd: string, n: number) =>
  new Date(Date.parse(ymd + 'T00:00:00Z') + n * 86400_000).toISOString().slice(0, 10);

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : '');

export const keywordHits = (sub: Subscriber, a: Announcement) => {
  const hay = `${a.title} ${a.summary} ${a.target} ${a.agency}`.toLowerCase();
  return (sub.keywords ?? []).filter((k) => k && hay.includes(k.toLowerCase())).length;
};

export type DigestPlan = {open: Announcement[]; upcoming: Announcement[]; ids: string[]};

/** Weekly subscribers only get mail on Mondays (KST); daily subscribers every day. */
export const isSendDay = (sub: Subscriber, now = new Date()) =>
  sub.frequency !== '주 1회' || kstNow(now).getUTCDay() === 1;

/**
 * New (not yet sent) announcements matching the subscriber, split like RnDcircle's
 * "지금 지원 가능 / 향후 지원 가능" lists. Keyword hits rank first, then nearest deadline.
 */
export function planDigest(sub: Subscriber, all: Announcement[], today = kstToday()): DigestPlan {
  const sent = new Set(sub.sentIds ?? []);
  const fresh = selectFor(sub, all, today).filter((a) => !sent.has(a.id));
  const rank = (x: Announcement, y: Announcement) =>
    keywordHits(sub, y) - keywordHits(sub, x) || (x.applyEnd ?? '9999').localeCompare(y.applyEnd ?? '9999');
  const horizon = addDays(today, UPCOMING_DAYS);
  const open = fresh.filter((a) => !a.applyStart || a.applyStart <= today).sort(rank);
  const upcoming = fresh.filter((a) => a.applyStart && a.applyStart > today && a.applyStart <= horizon).sort(rank);
  const picked = [...open, ...upcoming].slice(0, MAX_ITEMS);
  const keep = new Set(picked.map((a) => a.id));
  return {
    open: open.filter((a) => keep.has(a.id)),
    upcoming: upcoming.filter((a) => keep.has(a.id)),
    ids: picked.map((a) => a.id),
  };
}

export function renderDigest(sub: Subscriber, plan: DigestPlan, unsubscribeUrl: string, today = kstToday()) {
  const total = plan.open.length + plan.upcoming.length;
  const subject = `[지원톡] 나에게 맞는 지원사업 ${total}건 (${today})`;
  const dday = (a: Announcement) => {
    if (!a.applyEnd) return '상시/미정';
    const d = Math.round((Date.parse(a.applyEnd) - Date.parse(today)) / 86400_000);
    return `~${a.applyEnd} (D-${d})`;
  };
  const period = (a: Announcement) =>
    a.applyStart && a.applyStart > today ? `접수 시작 ${a.applyStart}` : dday(a);

  const itemHtml = (a: Announcement) => {
    const url = safeUrl(a.url);
    const title = url ? `<a href="${esc(url)}" style="color:#2563eb">${esc(a.title)}</a>` : esc(a.title);
    return `<li style="margin:0 0 14px"><b>${title}</b><br><span style="color:#5b6678;font-size:13px">${esc(
      [a.agency, a.regions.join(', '), period(a)].filter(Boolean).join(' · '),
    )}</span>${a.summary ? `<br><span style="font-size:14px">${esc(a.summary.slice(0, 120))}</span>` : ''}</li>`;
  };
  const section = (t: string, list: Announcement[]) =>
    list.length ? `<h3 style="margin:20px 0 8px">${t} (${list.length})</h3><ul style="padding-left:18px">${list.map(itemHtml).join('')}</ul>` : '';

  const html = `<div style="font-family:-apple-system,'Noto Sans KR',sans-serif;max-width:600px;margin:0 auto;color:#18202e">
<h2 style="margin:0 0 4px">나에게 맞는 지원사업</h2>
<p style="margin:0;color:#5b6678;font-size:13px">${esc(sub.regions.join(', '))} · ${esc(sub.supportTypes.join(', '))}${sub.keywords?.length ? ' · ' + esc(sub.keywords.join(', ')) : ''}</p>
${section('지금 지원 가능', plan.open)}${section('접수 예정 (60일 이내)', plan.upcoming)}
<hr style="border:0;border-top:1px solid #dde3ee;margin:24px 0 12px">
<p style="font-size:12px;color:#5b6678">지원 자격과 세부 요건은 반드시 각 공고문에서 확인해 주세요.<br><a href="${esc(unsubscribeUrl)}" style="color:#5b6678">수신 거부</a></p></div>`;

  const line = (a: Announcement) => `- ${a.title}\n  ${[a.agency, period(a)].filter(Boolean).join(' · ')}\n  ${safeUrl(a.url)}`;
  const text = [
    plan.open.length ? `[지금 지원 가능]\n${plan.open.map(line).join('\n')}` : '',
    plan.upcoming.length ? `[접수 예정]\n${plan.upcoming.map(line).join('\n')}` : '',
    `수신 거부: ${unsubscribeUrl}`,
  ].filter(Boolean).join('\n\n');

  return {subject, html, text};
}
