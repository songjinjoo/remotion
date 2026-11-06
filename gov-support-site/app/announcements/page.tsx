import Link from 'next/link';
import {readAnnouncements} from '@/lib/announcements';
import {isOpen} from '@/lib/match';
import {kstToday} from '@/lib/digest';
import {REGIONS, SUPPORT_TYPES} from '@/lib/options';

export const dynamic = 'force-dynamic';
export const metadata = {title: '지원사업 공고 - 지원톡'};

type Props = {searchParams: Promise<{region?: string; type?: string}>};

export default async function AnnouncementsPage({searchParams}: Props) {
  const {region, type} = await searchParams;
  const all = (await readAnnouncements({openOn: kstToday()})).filter((a) => isOpen(a, kstToday()));
  const list = all
    .filter((a) => !region || a.regions.includes('전국') || a.regions.includes(region))
    .filter((a) => !type || a.supportTypes.includes(type))
    .sort((x, y) => (x.applyEnd ?? '9999').localeCompare(y.applyEnd ?? '9999'));

  const href = (r?: string, t?: string) => {
    const p = new URLSearchParams();
    if (r) p.set('region', r);
    if (t) p.set('type', t);
    const q = p.toString();
    return '/announcements' + (q ? `?${q}` : '');
  };

  return (
    <main style={{paddingTop: 24, paddingBottom: 48}}>
      <p><Link href="/">← 홈</Link></p>
      <h1 style={{fontSize: 28}}>모집 중인 지원사업</h1>

      <div className="chips" style={{marginBottom: 8}}>
        <Link className={!region ? 'chip on' : 'chip'} href={href(undefined, type)}>전체 지역</Link>
        {REGIONS.filter((r) => r !== '전국').map((r) => (
          <Link key={r} className={region === r ? 'chip on' : 'chip'} href={href(r, type)}>{r}</Link>
        ))}
      </div>
      <div className="chips" style={{marginBottom: 24}}>
        <Link className={!type ? 'chip on' : 'chip'} href={href(region)}>전체 분야</Link>
        {SUPPORT_TYPES.map((t) => (
          <Link key={t} className={type === t ? 'chip on' : 'chip'} href={href(region, t)}>{t}</Link>
        ))}
      </div>

      <p className="hint" style={{textAlign: 'left'}}>{list.length}건</p>
      <div style={{display: 'grid', gap: 12}}>
        {list.map((a) => (
          <article key={a.id} className="card" style={{gap: 6}}>
            <h3 style={{margin: 0}}>
              {a.url ? <a href={a.url} target="_blank" rel="noopener noreferrer">{a.title}</a> : a.title}
            </h3>
            <div className="hint" style={{textAlign: 'left'}}>
              {a.agency && `${a.agency} · `}{a.regions.join(', ')} · 마감 {a.applyEnd ?? '상시/미정'}
            </div>
            {a.summary && <p style={{margin: 0, color: 'var(--muted)'}}>{a.summary}</p>}
            <div className="chips">
              {a.supportTypes.map((t) => <span key={t} className="chip on" style={{cursor: 'default'}}>{t}</span>)}
            </div>
          </article>
        ))}
        {list.length === 0 && <p>조건에 맞는 공고가 없습니다.</p>}
      </div>
    </main>
  );
}
