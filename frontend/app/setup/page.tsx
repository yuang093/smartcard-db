// ===================================================================
// Admin 儀表板 - 系統管理頁面
// 路徑: /setup
// 權限: 僅限 admin 帳號
// ===================================================================

'use client';

import React, { useState, useEffect } from 'react';

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
    if (!token) {
      setError('請先登入');
      return;
    }
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      // 載入統計
      const statsRes = await fetch('/api/v1/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!statsRes.ok) throw new Error('無權限或載入失敗');
      setStats(await statsRes.json());

      // 載入用戶列表
      const usersRes = await fetch('/api/v1/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!usersRes.ok) throw new Error('無權限或載入失敗');
      const usersData = await usersRes.json();
      setUsers(Array.isArray(usersData) ? usersData : (usersData.users || []));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    setActionLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ username: newUsername, password: newPassword, is_admin: newIsAdmin })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || '新增失敗');
      }
      setMessage('✅ 使用者新增成功');
      setNewUsername('');
      setNewPassword('');
      setNewIsAdmin(false);
      setShowAddUser(false);
      loadData();
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleChangePassword(userId: string) {
    if (!newPasswordInput.trim()) return;
    setActionLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ new_password: newPasswordInput })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || '修改密碼失敗');
      }
      setMessage('✅ 密碼已修改');
      setEditingPasswordUserId(null);
      setNewPasswordInput('');
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteUser(userId: string, username: string) {
    if (!confirm(`確定要刪除使用者「${username}」嗎？`)) return;
    setActionLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || '刪除失敗');
      }
      setMessage('✅ 使用者刪除成功');
      loadData();
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleAdmin(userId: string, currentAdmin: boolean) {
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_admin: !currentAdmin })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || '更新失敗');
      }
      loadData();
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => window.location.href = '/cards'} className="bg-blue-600 text-white px-4 py-2 rounded">返回名片頁</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">⚙️ 管理後台</h1>
          <button onClick={() => window.location.href = '/cards'} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
            返回名片
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4">
        {/* 訊息提示 */}
        {message && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2', color: message.includes('✅') ? '#065f46' : '#991b1b' }}>
            {message}
          </div>
        )}

        {/* 分頁切換 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'stats' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            📊 系統統計
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            👥 帳戶管理
          </button>
        </div>

        {/* 系統統計 */}
        {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500 text-sm">總名片數</p>
              <p className="text-3xl font-bold text-blue-600">{stats.total_cards}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500 text-sm">總使用者</p>
              <p className="text-3xl font-bold text-green-600">{stats.total_users}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500 text-sm">總標籤數</p>
              <p className="text-3xl font-bold text-purple-600">{stats.total_tags}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500 text-sm">圖檔儲存</p>
              <p className="text-3xl font-bold text-orange-600">{stats.total_storage_mb} MB</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500 text-sm">備份檔案數</p>
              <p className="text-3xl font-bold text-teal-600">{stats.backup_count}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500 text-sm">最後備份</p>
              <p className="text-lg font-bold text-gray-700">{stats.last_backup || '無'}</p>
            </div>
          </div>
        )}

        {/* 帳戶管理 */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">使用者列表</h2>
              <button
                onClick={() => setShowAddUser(!showAddUser)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                {showAddUser ? '取消新增' : '➕ 新增使用者'}
              </button>
            </div>

            {/* 新增用戶表單 */}
            {showAddUser && (
              <form onSubmit={handleAddUser} className="p-4 bg-gray-50 border-b">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">帳號</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="shadow border rounded w-full py-2 px-3 text-gray-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">密碼</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="shadow border rounded w-full py-2 px-3 text-gray-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">管理員</label>
                    <label className="flex items-center h-full">
                      <input
                        type="checkbox"
                        checked={newIsAdmin}
                        onChange={(e) => setNewIsAdmin(e.target.checked)}
                        className="mr-2 w-5 h-5"
                      />
                      <span className="text-sm text-gray-600">是管理員</span>
                    </label>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded disabled:opacity-50"
                  >
                    {actionLoading ? '新增中...' : '確認新增'}
                  </button>
                </div>
              </form>
            )}

            {/* 用戶列表 */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">帳號</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">身份</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">名片數</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">建立時間</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <React.Fragment key={user.id}>
                    <tr>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{user.username}</span>
                      </td>
                      <td className="px-4 py-3">
                        {user.is_admin ? (
                          <span className="px-2 py-1 text-xs font-bold rounded bg-red-100 text-red-700">Admin</span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-bold rounded bg-gray-100 text-gray-700">User</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{user.card_count}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{new Date(user.created_at).toLocaleDateString('zh-TW')}</td>
                      <td className="px-4 py-3 flex gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setEditingPasswordUserId(user.id);
                            setNewPasswordInput('');
                            setMessage('');
                          }}
                          className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                        >
                          修改密碼
                        </button>
                        {!user.is_admin && (
                          <button
                            onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                            className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded"
                          >
                            設為管理員
                          </button>
                        )}
                        {user.is_admin && users.filter(u => u.is_admin).length > 1 && (
                          <button
                            onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                            className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded"
                          >
                            取消管理員
                          </button>
                        )}
                        {user.username !== 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                          >
                            刪除
                          </button>
                        )}
                      </td>
                    </tr>
                    {editingPasswordUserId === user.id && (
                      <tr>
                        <td colSpan={5} className="px-4 py-3 bg-blue-50">
                          <form
                            onSubmit={(e) => { e.preventDefault(); handleChangePassword(user.id); }}
                            className="flex gap-2 items-center flex-wrap"
                          >
                            <span className="text-sm text-gray-700">新密碼：</span>
                            <input
                              type="password"
                              value={newPasswordInput}
                              onChange={(e) => setNewPasswordInput(e.target.value)}
                              className="shadow border rounded py-1 px-2 text-gray-700 text-sm"
                              placeholder="輸入新密碼"
                              required
                            />
                            <button
                              type="submit"
                              disabled={actionLoading}
                              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded disabled:opacity-50"
                            >
                              儲存
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPasswordUserId(null)}
                              className="text-xs bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded"
                            >
                              取消
                            </button>
                          </form>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}