import {NextResponse} from 'next/server';
import {
  BUSINESS_STAGES,
  FREQUENCIES,
  INDUSTRIES,
  REGIONS,
  SUPPORT_TYPES,
} from '@/lib/options';
import {upsertSubscriber} from '@/lib/store';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const pick = (value: unknown, allowed: readonly string[]): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string' && allowed.includes(v))
    : [];

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: '잘못된 요청입니다.'}, {status: 400});
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({error: '올바른 이메일 주소를 입력해 주세요.'}, {status: 400});
  }

  const industries = pick(body.industries, INDUSTRIES);
  const regions = pick(body.regions, REGIONS);
  const supportTypes = pick(body.supportTypes, SUPPORT_TYPES);
  if (!regions.length || !supportTypes.length) {
    return NextResponse.json(
      {error: '지역과 지원 분야를 각각 1개 이상 선택해 주세요.'},
      {status: 400},
    );
  }

  const keywords = (Array.isArray(body.keywords) ? body.keywords : typeof body.keywords === 'string' ? body.keywords.split(/[,\n]/) : [])
    .filter((k): k is string => typeof k === 'string')
    .map((k) => k.trim().slice(0, 30))
    .filter(Boolean)
    .slice(0, 10);

  const stage = BUSINESS_STAGES.find((s) => s === body.stage) ?? BUSINESS_STAGES[0];
  const frequency = FREQUENCIES.find((f) => f === body.frequency) ?? FREQUENCIES[1];

  const result = await upsertSubscriber({
    email,
    industries,
    regions,
    supportTypes,
    keywords,
    stage,
    frequency,
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({ok: true, result});
}
