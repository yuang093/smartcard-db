'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { tagsApi, Tag } from '@/lib/api';
import ThemeToggle from '@/components/ThemeToggle';

export default function TagsPage() {
  const { isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6B7280');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadTags();
    }
  }, [isAuthenticated]);

  const loadTags = async () => {
    try {
      setLoadingTags(true);
      const data = await tagsApi.list();
      setTags(data);
    } catch (err) {
      console.error('Failed to load tags:', err);
    } finally {
      setLoadingTags(false);
    }
  };

  const resetForm = () => {
    setName('');
    setColor('#6B7280');
    setEditingTag(null);
    setShowAddForm(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editingTag) {
        await tagsApi.update(editingTag.id, { name, color });
        setSuccess('標籤已更新');
      } else {
        await tagsApi.create(name, color);
        setSuccess('標籤已新增');
      }
      resetForm();
      loadTags();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失敗');
    }
  };

  const handleEdit = (tag: Tag) => {
    setName(tag.name);
    setColor(tag.color);
    setEditingTag(tag);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這個標籤嗎？')) return;
    try {
      await tagsApi.delete(id);
      loadTags();
    } catch (err) {
      setError('刪除失敗');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#667eea', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>載入中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const colorOptions = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E', '#6B7280', '#1F2937', '#000000',
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <header style={{ background: 'var(--header-bg)', boxShadow: '0 1px 3px var(--shadow-color)', borderBottom: '1px solid var(--header-border)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '1.5rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', background: 'linear-gradient(-45deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>標籤管理</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <ThemeToggle />
            <button
              onClick={() => router.push('/cards')}
              style={{ padding: '0.625rem 1rem', background: '#3B82F6', color: 'white', fontWeight: '600', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.875rem' }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#3B82F6'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              返回名片
            </button>
            <button
              onClick={handleLogout}
              style={{ padding: '0.625rem 1rem', background: '#EF4444', color: 'white', fontWeight: '600', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.875rem' }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#EF4444'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              登出
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: '1.5rem' }}>
        {/* Messages */}
        {success && (
          <div style={{ background: '#D1FAE5', border: '1px solid #A7F3D0', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#065F46', fontWeight: '500' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            {success}
          </div>
        )}
        {error && (
          <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#991B1B', fontWeight: '500' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div style={{ background: 'white', borderRadius: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', padding: '1.5rem', marginBottom: '1.5rem', animation: 'slideUp 0.3s ease-out' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {editingTag ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  編輯標籤
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  新增標籤
                </>
              )}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>標籤名稱</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：重要、緊急、客戶"
                  required
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #E5E7EB', borderRadius: '0.75rem', fontSize: '0.875rem', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                  onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.15)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>顏色</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', maxWidth: '280px' }}>
                  {colorOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{
                        width: '1.75rem',
                        height: '1.75rem',
                        borderRadius: '50%',
                        background: c,
                        border: color === c ? '3px solid #667eea' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        transform: color === c ? 'scale(1.15)' : 'scale(1)',
                        boxShadow: color === c ? '0 0 0 2px white, 0 0 0 4px #667eea' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="submit"
                  style={{ padding: '0.75rem 1.5rem', background: editingTag ? '#6366F1' : '#10B981', color: 'white', fontWeight: '600', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {editingTag ? '更新' : '新增'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{ padding: '0.75rem 1rem', background: '#E5E7EB', color: '#374151', fontWeight: '500', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.875rem' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#D1D5DB'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#E5E7EB'; }}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add Button (floating) */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            style={{ position: 'fixed', bottom: '2rem', right: '2rem', width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: 'linear-gradient(-45deg, #667eea, #764ba2)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px rgba(102,126,234,0.4)', transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40 }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 15px 35px rgba(102,126,234,0.5)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(102,126,234,0.4)'; }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        )}

        {/* Tags Grid */}
        {loadingTags ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#667eea', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : tags.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ width: '5rem', height: '5rem', margin: '0 auto 1.5rem', borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>還沒有標籤</h3>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1.5rem' }}>點擊右下角按鈕新增第一個標籤</p>
            <button
              onClick={() => setShowAddForm(true)}
              style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(-45deg, #667eea, #764ba2)', color: 'white', fontWeight: '600', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(102,126,234,0.4)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              新增標籤
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {tags.map((tag) => (
              <div
                key={tag.id}
                style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)', transition: 'all 0.2s', cursor: 'default' }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', background: tag.color }} />
                    <span style={{ fontWeight: '600', color: '#111827', fontSize: '0.875rem' }}>{tag.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      onClick={() => handleEdit(tag)}
                      style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: '#EEF2FF', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', color: '#6366F1' }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#6366F1'; e.currentTarget.style.color = 'white'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.color = '#6366F1'; }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id)}
                      style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: '#FEE2E2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', color: '#EF4444' }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#EF4444'; e.currentTarget.style.color = 'white'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#EF4444'; }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
                <div style={{ height: '0.375rem', borderRadius: '9999px', background: tag.color, opacity: 0.3 }} />
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}