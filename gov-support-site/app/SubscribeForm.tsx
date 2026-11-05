'use client';

import {useState} from 'react';
import {
  BUSINESS_STAGES,
  FREQUENCIES,
  INDUSTRIES,
  REGIONS,
  SUPPORT_TYPES,
} from '@/lib/options';

function Chips({
  name,
  options,
  selected,
  onToggle,
}: {
  name: string;
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="chips" role="group" aria-label={name}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={selected.includes(o)}
          className={selected.includes(o) ? 'chip on' : 'chip'}
          onClick={() => onToggle(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

const toggle = (list: string[], v: string) =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

export function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [industries, setIndustries] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [supportTypes, setSupportTypes] = useState<string[]>([]);
  const [stage, setStage] = useState<string>(BUSINESS_STAGES[0]);
  const [frequency, setFrequency] = useState<string>(FREQUENCIES[1]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, industries, regions, supportTypes, stage, frequency}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '신청에 실패했습니다.');
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : '신청에 실패했습니다.');
      setStatus('idle');
    }
  }

  if (status === 'done') {
    return (
      <div className="card done">
        <h3>구독 신청이 완료되었습니다 🎉</h3>
        <p>
          선택하신 조건에 맞는 공고가 올라오면 <b>{email}</b> 로 보내드릴게요.
        </p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={submit}>
      <label>
        <span className="label">이메일 *</span>
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <div>
        <span className="label">관심 지역 * (복수 선택)</span>
        <Chips name="지역" options={REGIONS} selected={regions} onToggle={(v) => setRegions(toggle(regions, v))} />
      </div>
      <div>
        <span className="label">지원 분야 * (복수 선택)</span>
        <Chips name="지원 분야" options={SUPPORT_TYPES} selected={supportTypes} onToggle={(v) => setSupportTypes(toggle(supportTypes, v))} />
      </div>
      <div>
        <span className="label">업종 (복수 선택)</span>
        <Chips name="업종" options={INDUSTRIES} selected={industries} onToggle={(v) => setIndustries(toggle(industries, v))} />
      </div>

      <div className="row">
        <label>
          <span className="label">사업 단계</span>
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            {BUSINESS_STAGES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">수신 주기</span>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            {FREQUENCIES.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      <button className="submit" disabled={status === 'loading'}>
        {status === 'loading' ? '신청 중…' : '무료로 구독하기'}
      </button>
      <p className="hint">언제든 수신 거부할 수 있으며, 이메일은 공고 안내 목적으로만 사용됩니다.</p>
    </form>
  );
}
