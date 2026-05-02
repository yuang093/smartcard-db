'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const tokenResponse = await authApi.login(username, password);
      const user = await authApi.getMeWithToken(tokenResponse.access_token);
      login(tokenResponse.access_token, user);
      router.push('/cards');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登入失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #f5576c)',
      backgroundSize: '400% 400%',
      animation: 'gradientShift 10s ease infinite',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Floating blobs */}
      <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '400px', height: '400px', borderRadius: '50%', opacity: 0.4, background: '#f093fb', filter: 'blur(60px)', animation: 'float1 8s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '350px', height: '350px', borderRadius: '50%', opacity: 0.4, background: '#667eea', filter: 'blur(60px)', animation: 'float2 10s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '300px', height: '300px', borderRadius: '50%', opacity: 0.3, background: '#764ba2', filter: 'blur(80px)', animation: 'pulse 6s ease-in-out infinite' }} />

      {/* Login Card */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        background: 'white',
        borderRadius: '1.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        width: '100%',
        maxWidth: '28rem',
        overflow: 'hidden',
        animation: 'slideUp 0.5s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '2.5rem 2rem',
          background: 'linear-gradient(-45deg, #667eea 0%, #764ba2 100%)',
          textAlign: 'center',
        }}>
          <div style={{
            width: '5rem',
            height: '5rem',
            margin: '0 auto 1rem',
            borderRadius: '1.5rem',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M7 8h6M7 12h10M7 16h4"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'white', marginBottom: '0.25rem' }}>SmartCard</h1>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>名片管理系統</p>
        </div>

        {/* Form */}
        <div style={{ padding: '2rem' }}>
          {error && (
            <div style={{
              background: '#FEE2E2',
              border: '1px solid #FECACA',
              borderRadius: '0.75rem',
              padding: '0.875rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{ fontSize: '0.875rem', color: '#991B1B' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>帳號</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="請輸入帳號"
                  required
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem 0.875rem 3rem',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.75rem',
                    fontSize: '1rem',
                    transition: 'all 0.2s',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>密碼</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="請輸入密碼"
                  required
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem 0.875rem 3rem',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.75rem',
                    fontSize: '1rem',
                    transition: 'all 0.2s',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '1rem',
                marginTop: '0.5rem',
                background: loading ? '#9CA3AF' : 'linear-gradient(-45deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                border: 'none',
                borderRadius: '0.75rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: loading ? 'none' : '0 4px 14px 0 rgba(102, 126, 234, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = loading ? 'none' : '0 4px 14px 0 rgba(102, 126, 234, 0.4)';
              }}
            >
              {loading ? (
                <>
                  <svg style={{ animation: 'spin 1s linear infinite' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"/>
                  </svg>
                  登入中...
                </>
              ) : '登入'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
              還沒有帳號？<Link href="/register" style={{ color: '#667eea', fontWeight: '600', textDecoration: 'none' }}>立即註冊</Link>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-30px, 30px); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(25px, -25px); }
        }
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
          50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.5; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}