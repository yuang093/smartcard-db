'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/api';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('密碼與確認密碼不相符');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('密碼長度至少需要 6 個字元');
      return;
    }

    setLoading(true);

    try {
      // Register
      await authApi.register(email, password);
      
      // Auto login after register
      const tokenResponse = await authApi.login(email, password);
      const user = await authApi.getMe();
      
      login(tokenResponse.access_token, user);
      router.push('/cards');
    } catch (err) {
      setError(err instanceof Error ? err.message : '註冊失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">SmartCard 註冊</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              電子郵件
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              密碼
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="********"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
              確認密碼
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="********"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
          >
            {loading ? '註冊中...' : '註冊'}
          </button>
        </form>

        <p className="text-center mt-4 text-gray-600">
          已有帳號？{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-800">
            登入
          </Link>
        </p>
      </div>
    </div>
  );
}