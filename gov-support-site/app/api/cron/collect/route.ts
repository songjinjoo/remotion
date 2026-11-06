import {NextResponse} from 'next/server';
import {saveAnnouncements} from '@/lib/announcements';
import {recordRun} from '@/lib/runs';
import {fetchBizinfo} from '@/lib/sources/bizinfo';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Collect announcements from all configured sources into the DB and log each run (collect_runs).
 * Protect with CRON_SECRET: call with `Authorization: Bearer <CRON_SECRET>`
 * (Vercel Cron sends this header automatically when CRON_SECRET is set).
 * A source that returns 0 items is logged as 'empty' (likely a changed response format or bad key) and
 * makes this endpoint answer 502 so schedulers/monitors flag it.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401});
  }

  const report: Record<string, {status: string; fetched?: number; added?: number; error?: string}> = {};
  const startedAt = new Date();

  const bizKey = process.env.BIZINFO_API_KEY;
  if (!bizKey) {
    report.bizinfo = {status: 'skipped', error: 'BIZINFO_API_KEY not set'};
    await recordRun({source: 'bizinfo', startedAt, status: 'skipped', error: 'BIZINFO_API_KEY not set'}).catch(() => undefined);
  } else {
    try {
      const items = await fetchBizinfo(bizKey);
      const {added} = items.length ? await saveAnnouncements(items) : {added: 0};
      const status = items.length ? 'ok' : 'empty';
      report.bizinfo = {status, fetched: items.length, added};
      await recordRun({source: 'bizinfo', startedAt, status, fetched: items.length, added});
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      report.bizinfo = {status: 'error', error};
      await recordRun({source: 'bizinfo', startedAt, status: 'error', error}).catch(() => undefined);
    }
  }

  const failed = Object.values(report).some((r) => r.status === 'error' || r.status === 'empty');
  return NextResponse.json({report}, {status: failed ? 502 : 200});
}
