import {NextResponse} from 'next/server';
import {removeSubscriber} from '@/lib/store';
import {verifyUnsubscribe} from '@/lib/unsubscribe';

export const dynamic = 'force-dynamic';

const page = (msg: string, status = 200) =>
  new NextResponse(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>수신 거부</title><body style="font-family:sans-serif;max-width:480px;margin:15vh auto;padding:0 16px;text-align:center"><p>${msg}</p><a href="/">홈으로</a>`, {
    status,
    headers: {'content-type': 'text/html; charset=utf-8'},
  });

async function handle(req: Request) {
  const u = new URL(req.url);
  const email = (u.searchParams.get('email') ?? '').toLowerCase();
  const token = u.searchParams.get('token') ?? '';
  if (!email || !verifyUnsubscribe(email, token)) return page('유효하지 않은 수신 거부 링크입니다.', 400);
  await removeSubscriber(email);
  return page('수신 거부가 완료되었습니다. 더 이상 메일을 보내지 않습니다.');
}

// GET for the link in the mail; POST for one-click List-Unsubscribe clients.
export const GET = handle;
export const POST = handle;
