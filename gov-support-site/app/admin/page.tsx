import {AdminClient} from './AdminClient';

export const metadata = {title: '공고 관리 - 지원톡', robots: {index: false, follow: false}};

export default function AdminPage() {
  return (
    <main style={{paddingTop: 24, paddingBottom: 48}}>
      <h1 style={{fontSize: 26}}>공고 데이터 관리</h1>
      <AdminClient />
    </main>
  );
}
