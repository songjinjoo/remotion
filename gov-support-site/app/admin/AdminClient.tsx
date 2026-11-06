'use client';

import {useCallback, useState} from 'react';
import type {Announcement} from '@/lib/announcements';

const TEMPLATE =
  '제목,링크,기관,요약,지원분야,지역,업종,신청시작,신청종료\n' +
  '"예시 창업지원 공고",https://example.com/1,서울특별시,"예비창업자 대상 사업화 자금",창업지원,서울,IT·소프트웨어,2026-11-01,2026-11-30';

type Result = {received: number; imported: number; added: number; total: number; errors: string[]};

export function AdminClient() {
  const [pw, setPw] = useState('');
  const [authed, setAuthed] = useState(false);
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [items, setItems] = useState<Announcement[]>([]);

  const call = useCallback(
    async (init?: RequestInit, qs = '') => {
      const res = await fetch('/api/admin/announcements' + qs, {
        ...init,
        headers: {...init?.headers, Authorization: `Bearer ${pw}`, 'Content-Type': 'application/json'},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '요청 실패');
      return data;
    },
    [pw],
  );

  const load = useCallback(async () => setItems((await call()).items), [call]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await load();
      setAuthed(true);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : '실패');
    }
  }

  async function submit() {
    setMsg('');
    setResult(null);
    try {
      const r = await call({method: 'POST', body: JSON.stringify({format, data: text})});
      setResult(r);
      if (r.imported) setText('');
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : '실패');
    }
  }

  async function remove(id: string) {
    if (!confirm('이 공고를 삭제할까요?')) return;
    await call({method: 'DELETE'}, `?id=${encodeURIComponent(id)}`);
    await load();
  }

  if (!authed) {
    return (
      <form className="card" onSubmit={login}>
        <label>
          <span className="label">관리자 비밀번호</span>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        </label>
        {msg && <p className="error" role="alert">{msg}</p>}
        <button className="submit">로그인</button>
      </form>
    );
  }

  return (
    <div style={{display: 'grid', gap: 24}}>
      <section className="card">
        <h2 style={{margin: 0}}>공고 일괄 등록</h2>
        <p className="hint" style={{textAlign: 'left'}}>
          엑셀·구글시트에서 복사해 붙여넣거나 CSV/JSON을 입력하세요. 첫 줄은 헤더(제목, 링크, 기관, 요약, 지원대상, 지원분야, 지역, 업종, 신청시작, 신청종료)입니다.
          제목만 필수이며, 지원분야·지역·업종을 비우면 내용에서 자동 분류합니다. 같은 링크(없으면 제목)는 덮어씁니다.
        </p>
        <div className="chips">
          {(['csv', 'json'] as const).map((f) => (
            <button key={f} type="button" className={format === f ? 'chip on' : 'chip'} onClick={() => setFormat(f)}>
              {f === 'csv' ? 'CSV / 표 붙여넣기' : 'JSON'}
            </button>
          ))}
          {format === 'csv' && (
            <button type="button" className="chip" onClick={() => setText(TEMPLATE)}>예시 채우기</button>
          )}
        </div>
        <textarea
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={format === 'csv' ? TEMPLATE : '[{"title":"공고명","url":"https://...","applyEnd":"2026-12-31"}]'}
          style={{width: '100%', padding: 12, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'monospace'}}
        />
        {msg && <p className="error" role="alert">{msg}</p>}
        <button className="submit" onClick={submit} disabled={!text.trim()}>등록하기</button>
        {result && (
          <div role="status">
            <p>
              {result.received}건 중 <b>{result.imported}건</b> 처리 (신규 {result.added}건), 전체 {result.total}건
            </p>
            {result.errors.length > 0 && <ul className="error">{result.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
          </div>
        )}
      </section>

      <section className="card">
        <h2 style={{margin: 0}}>등록된 공고 ({items.length})</h2>
        {items.length === 0 && <p className="hint">아직 없습니다.</p>}
        {items.map((a) => (
          <div key={a.id} style={{borderTop: '1px solid var(--line)', paddingTop: 12, display: 'flex', gap: 12, justifyContent: 'space-between'}}>
            <div>
              <b>{a.title}</b>
              <div className="hint" style={{textAlign: 'left'}}>
                {a.agency} · {a.regions.join(',')} · {a.supportTypes.join(',') || '분야 미분류'} · 마감 {a.applyEnd ?? '상시/미정'}
              </div>
            </div>
            <button className="chip" onClick={() => remove(a.id)}>삭제</button>
          </div>
        ))}
      </section>
    </div>
  );
}
