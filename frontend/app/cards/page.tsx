'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function CardsPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>載入中...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">名片管理</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-700">名片列表頁面（开发中）</p>
        </div>
      </main>
    </div>
  );
}