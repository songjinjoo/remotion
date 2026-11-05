import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '지원톡 - 맞춤 정부지원사업 알림',
  description:
    '업종·지역·지원 분야만 고르면 나에게 맞는 정부지원사업 공고만 이메일로 보내드립니다.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
