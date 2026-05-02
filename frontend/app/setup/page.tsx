// ===================================================================
// Admin 儀表板 - 系統管理頁面
// 路徑: /setup
// 權限: 僅限 admin 帳號
// ===================================================================

'use client';

import React, { useState, useEffect } from 'react';
import ThemeToggle from '@/components/ThemeToggle';

interface SystemStats {
  total_cards: number;
  total_users: number;
  total_tags: number;
  total_storage_mb: number;
  backup_count: number;
  last_backup: string | null;
}

interface User {
  id: string;
  username: string;
  is_active: boolean;
  is_admin: boolean;
  card_count: number;
  created_at: string;
}

export default function SetupPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'users'>('stats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  const auth = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('smartcard_auth') || '{}') : {};
  const token = auth.token;

  useEffect(() => {
    if (!token) { setError('請先登入'); return; }
    loadData();
  }, []);

  async function loadData() {
    setLoading(true); setError('');
    try {
      const statsRes = await fetch('/api/v1/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } });
      if (!statsRes.ok) throw new Error('無權限或載入失敗');
      setStats(await statsRes.json());
      const usersRes = await fetch('/api/v1/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
      if (!usersRes.ok) throw new Error('無權限或載入失敗');
      const usersData = await usersRes.json();
      setUsers(Array.isArray(usersData) ? usersData : (usersData.users || []));
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    setActionLoading(true); setMessage('');
    try {
      const res = await fetch('/api/v1/admin/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ username: newUsername, password: newPassword, is_admin: newIsAdmin })
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || '新增失敗'); }
      setMessage('✅ 使用者新增成功');
      setNewUsername(''); setNewPassword(''); setNewIsAdmin(false); setShowAddUser(false);
      loadData();
    } catch (err: any) { setMessage(`❌ ${err.message}`); }
    finally { setActionLoading(false); }
  }

  async function handleChangePassword(userId: string) {
    if (!newPasswordInput.trim()) return;
    setActionLoading(true); setMessage('');
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/password`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ new_password: newPasswordInput })
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || '修改密碼失敗'); }
      setMessage('✅ 密碼已修改');
      setEditingPasswordUserId(null); setNewPasswordInput('');
    } catch (err: any) { setMessage(`❌ ${err.message}`); }
    finally { setActionLoading(false); }
  }

  async function handleDeleteUser(userId: string, username: string) {
    if (!confirm(`確定要刪除「${username}」嗎？`)) return;
    setActionLoading(true); setMessage('');
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || '刪除失敗'); }
      setMessage('✅ 使用者刪除成功'); loadData();
    } catch (err: any) { setMessage(`❌ ${err.message}`); }
    finally { setActionLoading(false); }
  }

  async function handleToggleAdmin(userId: string, currentAdmin: boolean) {
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_admin: !currentAdmin })
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || '更新失敗'); }
      loadData();
    } catch (err: any) { setMessage(`❌ ${err.message}`); }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#667eea', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>載入中...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '1.5rem', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '24rem', width: '100%' }}>
        <p style={{ color: '#DC2626', fontWeight: '600', marginBottom: '1rem' }}>{error}</p>
        <button onClick={() => window.location.href = '/cards'} style={{ padding: '0.75rem 1.5rem', background: '#3B82F6', color: 'white', fontWeight: '600', borderRadius: '0.75rem', border: 'none', cursor: 'pointer' }}>返回名片頁</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <header style={{ background: 'var(--header-bg)', boxShadow: '0 1px 3px var(--shadow-color)', borderBottom: '1px solid var(--header-border)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'linear-gradient(-45deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>管理後台</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <ThemeToggle />
            <button onClick={() => window.location.href = '/cards'} style={{ padding: '0.5rem 0.875rem', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: '600', borderRadius: '0.625rem', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.8125rem' }}>← 返回名片</button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: '1rem' }}>
        {message && (
          <div style={{ background: message.includes('✅') ? '#D1FAE5' : '#FEE2E2', border: `1px solid ${message.includes('✅') ? '#A7F3D0' : '#FECACA'}`, borderRadius: '0.75rem', padding: '0.875rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: message.includes('✅') ? '#065F46' : '#991B1B', fontWeight: '500', fontSize: '0.875rem' }}>
            <span>{message.includes('✅') ? '✓' : '✗'}</span>
            {message.replace('✅', '').replace('❌', '')}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {[
            { key: 'stats', label: '📊 系統統計' },
            { key: 'users', label: '👥 帳戶管理' },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              style={{ padding: '0.625rem 1rem', borderRadius: '0.625rem', fontWeight: '600', fontSize: '0.8125rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', background: activeTab === tab.key ? 'linear-gradient(-45deg, #667eea, #764ba2)' : 'white', color: activeTab === tab.key ? 'white' : '#374151', boxShadow: activeTab === tab.key ? '0 4px 12px rgba(102,126,234,0.3)' : '0 1px 3px rgba(0,0,0,0.1)' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        {activeTab === 'stats' && stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
            {[
              { label: '總名片數', value: stats.total_cards, color: '#3B82F6', emoji: '📇' },
              { label: '總使用者', value: stats.total_users, color: '#10B981', emoji: '👥' },
              { label: '總標籤數', value: stats.total_tags, color: '#8B5CF6', emoji: '🏷️' },
              { label: '圖檔儲存', value: `${stats.total_storage_mb} MB`, color: '#F97316', emoji: '💾' },
              { label: '備份檔案', value: stats.backup_count, color: '#06B6D4', emoji: '📦' },
              { label: '最後備份', value: stats.last_backup || '無', color: '#6B7280', emoji: '🕐' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.2s' }}
                onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)'; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1rem' }}>{s.emoji}</span>
                  <p style={{ color: '#6B7280', fontSize: '0.6875rem', fontWeight: '600', textTransform: 'uppercase' }}>{s.label}</p>
                </div>
                <p style={{ fontSize: '1.5rem', fontWeight: '700', color: s.color, wordBreak: 'break-all' }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Add Button */}
            <button onClick={() => setShowAddUser(!showAddUser)}
              style={{ padding: '0.75rem 1rem', background: showAddUser ? '#E5E7EB' : '#10B981', color: showAddUser ? '#374151' : 'white', fontWeight: '600', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              {showAddUser ? '✕ 取消新增' : '➕ 新增使用者'}
            </button>

            {/* Add Form */}
            {showAddUser && (
              <form onSubmit={handleAddUser} style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', marginBottom: '0.375rem' }}>帳號</label>
                    <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="輸入帳號" required
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #E5E7EB', borderRadius: '0.625rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                      onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.15)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', marginBottom: '0.375rem' }}>密碼</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="輸入密碼" required
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #E5E7EB', borderRadius: '0.625rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                      onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.15)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={newIsAdmin} onChange={(e) => setNewIsAdmin(e.target.checked)} style={{ width: '1rem', height: '1rem', accentColor: '#667eea' }} />
                    <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>設為管理員</span>
                  </div>
                  <button type="submit" disabled={actionLoading}
                    style={{ padding: '0.75rem', background: actionLoading ? '#9CA3AF' : '#10B981', color: 'white', fontWeight: '600', borderRadius: '0.625rem', border: 'none', cursor: actionLoading ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}>
                    {actionLoading ? '新增中...' : '確認新增'}
                  </button>
                </div>
              </form>
            )}

            {/* User Cards */}
            {users.map((user) => (
              <div key={user.id} style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* User Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '700', color: '#111827', fontSize: '1rem' }}>{user.username}</span>
                      <span style={{ display: 'inline-block', padding: '0.125rem 0.5rem', fontSize: '0.6875rem', fontWeight: '700', borderRadius: '9999px', background: user.is_admin ? '#FEE2E2' : '#F3F4F6', color: user.is_admin ? '#DC2626' : '#6B7280' }}>
                        {user.is_admin ? 'Admin' : 'User'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                      <span>📇 {user.card_count} 張名片</span>
                      <span style={{ marginLeft: '0.75rem' }}>📅 {new Date(user.created_at).toLocaleDateString('zh-TW')}</span>
                    </div>
                  </div>
                </div>

                {/* Password Edit Form */}
                {editingPasswordUserId === user.id && (
                  <div style={{ background: '#EEF2FF', borderRadius: '0.625rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#4B5563', fontWeight: '600' }}>🔐 輸入新密碼：</span>
                    <input type="password" value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} placeholder="輸入新密碼" required
                      style={{ padding: '0.625rem 0.75rem', border: '1px solid #C7D2FE', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', width: '100%' }}
                      onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.15)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#C7D2FE'; e.target.style.boxShadow = 'none'; }} />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleChangePassword(user.id)} disabled={actionLoading}
                        style={{ flex: 1, padding: '0.5rem', background: '#6366F1', color: 'white', fontWeight: '600', fontSize: '0.8125rem', borderRadius: '0.5rem', border: 'none', cursor: actionLoading ? 'not-allowed' : 'pointer' }}>
                        儲存
                      </button>
                      <button onClick={() => setEditingPasswordUserId(null)}
                        style={{ flex: 1, padding: '0.5rem', background: '#E5E7EB', color: '#6B7280', fontWeight: '600', fontSize: '0.8125rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>
                        取消
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button onClick={() => { setEditingPasswordUserId(user.id); setNewPasswordInput(''); setMessage(''); }}
                    style={{ padding: '0.5rem 0.75rem', background: '#EEF2FF', color: '#6366F1', fontWeight: '600', fontSize: '0.75rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    🔐 改密碼
                  </button>
                  {!user.is_admin && (
                    <button onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                      style={{ padding: '0.5rem 0.75rem', background: '#FEF3C7', color: '#D97706', fontWeight: '600', fontSize: '0.75rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      ⭐ 設管理員
                    </button>
                  )}
                  {user.is_admin && users.filter(u => u.is_admin).length > 1 && (
                    <button onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                      style={{ padding: '0.5rem 0.75rem', background: '#F3F4F6', color: '#6B7280', fontWeight: '600', fontSize: '0.75rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      ◯ 取消
                    </button>
                  )}
                  {user.username !== 'admin' && (
                    <button onClick={() => handleDeleteUser(user.id, user.username)}
                      style={{ padding: '0.5rem 0.75rem', background: '#FEE2E2', color: '#EF4444', fontWeight: '600', fontSize: '0.75rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      🗑️ 刪除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}