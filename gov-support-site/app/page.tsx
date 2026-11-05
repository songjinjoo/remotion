import {SubscribeForm} from './SubscribeForm';

const STEPS = [
  ['1', '조건 선택', '지역·지원 분야·업종을 한 번만 골라주세요.'],
  ['2', '공고 자동 선별', '새로 올라온 공고 중 내 조건에 맞는 것만 골라냅니다.'],
  ['3', '이메일 수신', '마감일과 지원 대상을 정리해 매일 또는 주 1회 보내드려요.'],
] as const;

const FEATURES = [
  ['🎯', '맞춤 선별', '수백 건의 공고 중 나에게 해당하는 것만'],
  ['⏰', '마감 임박 알림', '놓치기 쉬운 마감일을 한눈에'],
  ['📨', '이메일로 간편하게', '별도 앱 설치나 로그인 없이'],
] as const;

export default function Home() {
  return (
    <>
      <header className="nav">
        <strong>지원톡</strong>
        <a href="#subscribe">구독하기</a>
      </header>

      <main>
        <section className="hero">
          <p className="badge">정부지원사업 맞춤 알림</p>
          <h1>
            수많은 공고 속에서
            <br />
            <em>나에게 맞는 지원사업</em>만 받아보세요
          </h1>
          <p className="sub">
            업종·지역·지원 분야를 선택하면, 조건에 맞는 정부지원사업 공고를 이메일로 보내드립니다.
          </p>
          <a className="cta" href="#subscribe">무료로 시작하기</a>
        </section>

        <section className="features">
          {FEATURES.map(([icon, title, desc]) => (
            <div key={title} className="feature">
              <span className="icon">{icon}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </section>

        <section className="steps">
          <h2>이렇게 이용해요</h2>
          <ol>
            {STEPS.map(([n, title, desc]) => (
              <li key={n}>
                <span className="num">{n}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="subscribe" className="subscribe">
          <h2>내 조건 등록하기</h2>
          <SubscribeForm />
        </section>
      </main>

      <footer className="footer">© 지원톡 · 본 서비스는 공고 정보를 안내하며, 지원 자격은 각 공고문을 확인해 주세요.</footer>
    </>
  );
}
