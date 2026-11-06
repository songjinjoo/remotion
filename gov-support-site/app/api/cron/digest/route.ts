import {NextResponse} from 'next/server';
import {readAnnouncements} from '@/lib/announcements';
import {isSendDay, kstToday, planDigest, renderDigest} from '@/lib/digest';
import {sendMail} from '@/lib/mailer';
import {markSent, readSubscribers} from '@/lib/store';
import {hasUnsubscribeSecret, unsubscribeToken} from '@/lib/unsubscribe';

export const dynamic = 'force-dynamic';

/**
 * Daily digest. Call with `Authorization: Bearer <CRON_SECRET>` (Vercel Cron does this automatically).
 * `?dryRun=1` (or no RESEND_API_KEY) renders previews without sending or marking anything as sent.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401});
  }
  if (!hasUnsubscribeSecret()) return NextResponse.json({error: 'unsubscribe secret missing'}, {status: 500});

  const url = new URL(req.url);
  const canSend = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  const dryRun = url.searchParams.get('dryRun') === '1' || !canSend;
  const base = process.env.SITE_URL || url.origin;

  const [subs, anns] = await Promise.all([readSubscribers(), readAnnouncements({openOn: kstToday()})]);
  const today = kstToday();
  const results: {email: string; status: string; count?: number; subject?: string}[] = [];

  for (const sub of subs) {
    if (!isSendDay(sub)) { results.push({email: sub.email, status: 'skipped: not send day'}); continue; }
    const plan = planDigest(sub, anns, today);
    if (!plan.ids.length) { results.push({email: sub.email, status: 'skipped: nothing new'}); continue; }
    const unsubscribeUrl = `${base}/api/unsubscribe?email=${encodeURIComponent(sub.email)}&token=${unsubscribeToken(sub.email)}`;
    const mail = renderDigest(sub, plan, unsubscribeUrl, today);
    if (dryRun) { results.push({email: sub.email, status: 'dry-run', count: plan.ids.length, subject: mail.subject}); continue; }
    try {
      await sendMail({to: sub.email, ...mail, unsubscribeUrl});
      await markSent(sub.email, plan.ids);
      results.push({email: sub.email, status: 'sent', count: plan.ids.length});
    } catch (e) {
      results.push({email: sub.email, status: `error: ${e instanceof Error ? e.message : String(e)}`});
    }
  }
  return NextResponse.json({dryRun, canSend, results});
}
