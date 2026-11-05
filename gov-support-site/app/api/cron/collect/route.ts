import {NextResponse} from 'next/server';
import {saveAnnouncements, type Announcement} from '@/lib/announcements';
import {fetchBizinfo} from '@/lib/sources/bizinfo';

export const dynamic = 'force-dynamic';

/**
 * Collect announcements from all configured sources.
 * Protect with CRON_SECRET: call with `Authorization: Bearer <CRON_SECRET>`
 * (Vercel Cron sends this header automatically when CRON_SECRET is set).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401});
  }

  const collected: Announcement[] = [];
  const report: Record<string, string> = {};

  const bizKey = process.env.BIZINFO_API_KEY;
  if (bizKey) {
    try {
      const items = await fetchBizinfo(bizKey);
      collected.push(...items);
      report.bizinfo = `ok (${items.length})`;
    } catch (e) {
      report.bizinfo = `error: ${e instanceof Error ? e.message : String(e)}`;
    }
  } else {
    report.bizinfo = 'skipped (BIZINFO_API_KEY not set)';
  }

  const saved = await saveAnnouncements(collected);
  return NextResponse.json({report, ...saved});
}
