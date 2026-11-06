import {NextResponse} from 'next/server';
import {deleteAnnouncement, readAnnouncements, saveAnnouncements} from '@/lib/announcements';
import {isAdmin} from '@/lib/adminAuth';
import {csvToRows, importRows, type RawRow} from '@/lib/import';

export const dynamic = 'force-dynamic';
const unauthorized = () => NextResponse.json({error: '관리자 인증에 실패했습니다.'}, {status: 401});

export async function GET(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  return NextResponse.json({items: await readAnnouncements()});
}

/** Body: {format: 'csv', data: string} | {format: 'json', data: object[] | string} | {format: 'single', data: object} */
export async function POST(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  let body: {format?: string; data?: unknown};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: '잘못된 요청입니다.'}, {status: 400});
  }

  let rows: RawRow[];
  try {
    if (body.format === 'csv') rows = csvToRows(String(body.data ?? ''));
    else if (body.format === 'single') rows = [body.data as RawRow];
    else if (body.format === 'json') {
      const parsed = typeof body.data === 'string' ? JSON.parse(body.data) : body.data;
      rows = Array.isArray(parsed) ? parsed : [parsed];
    } else return NextResponse.json({error: 'format은 csv, json, single 중 하나여야 합니다.'}, {status: 400});
  } catch {
    return NextResponse.json({error: '데이터를 해석할 수 없습니다. 형식을 확인해 주세요.'}, {status: 400});
  }
  if (rows.length > 1000) return NextResponse.json({error: '한 번에 1000건까지 등록할 수 있습니다.'}, {status: 400});

  const {items, errors} = importRows(rows.filter((r) => r && typeof r === 'object'));
  const saved = items.length ? await saveAnnouncements(items) : {added: 0, total: (await readAnnouncements()).length};
  return NextResponse.json({received: rows.length, imported: items.length, added: saved.added, total: saved.total, errors});
}

export async function DELETE(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({error: 'id가 필요합니다.'}, {status: 400});
  return NextResponse.json({deleted: await deleteAnnouncement(id)});
}
