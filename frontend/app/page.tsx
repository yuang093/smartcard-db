'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.replace('/cards');
      } else {
        router.replace('/login');
      }
    }
  }, [loading, isAuthenticated, router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #f5576c)',
      backgroundSize: '400% 400%',
      animation: 'gradientShift 10s ease infinite',
    }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📇</div>
        <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>SmartCard DB</div>
        <div style={{ marginTop: '0.5rem', opacity: 0.8 }}>載入中...</div>
      </div>
    </div>
  );
}