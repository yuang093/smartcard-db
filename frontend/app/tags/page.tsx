'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { tagsApi, Tag } from '@/lib/api';

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
      <div className="min-h-screen flex items-center justify-center">
        <p>載入中...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const colorOptions = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E', '#6B7280', '#1F2937', '#000000',
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">標籤管理</h1>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/cards')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              返回名片
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              登出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4">
        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm ? (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">
              {editingTag ? '編輯標籤' : '新增標籤'}
            </h2>
            <form onSubmit={handleSubmit} className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-gray-700 text-sm font-bold mb-2">標籤名稱</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="輸入標籤名稱"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">顏色</label>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-16 h-10 rounded cursor-pointer"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded"
                >
                  {editingTag ? '更新' : '新增'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded mb-6"
          >
            + 新增標籤
          </button>
        )}

        {/* Tags List */}
        {loadingTags ? (
          <p>載入中...</p>
        ) : tags.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            尚無標籤資料
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tags.map((tag) => (
              <div key={tag.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(tag)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      刪除
                    </button>
                  </div>
                </div>
                <p className="font-medium text-gray-900">{tag.name}</p>
              </div>
            ))}
          </div>
        )}

        {/* Color Palette Reference */}
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-3 text-gray-700">可用顏色參考</h3>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((c) => (
              <div
                key={c}
                className="w-8 h-8 rounded-full cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
                title={c}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}