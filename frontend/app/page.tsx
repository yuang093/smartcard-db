import { redirect } from 'next/navigation';
import { useAuth } from './lib/auth';

export default function Home() {
  // This is a server component - we check auth on client side via redirect
  // For now, just render a simple landing
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>SmartCard DB</h1>
      <p>智慧名片管理系統</p>
      <div style={{ marginTop: '1rem' }}>
        <a href="/login" style={{ marginRight: '1rem', color: 'blue' }}>登入</a>
        <a href="/register" style={{ color: 'green' }}>註冊</a>
      </div>
    </div>
  );
}