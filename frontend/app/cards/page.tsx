'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { cardsApi, Card } from '@/lib/api';

export default function CardsPage() {
  const { isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [search, setSearch] = useState('');
  const [loadingCards, setLoadingCards] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    title: '',
    phone: '',
    mobile: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCards();
    }
  }, [isAuthenticated]);

  const loadCards = async () => {
    try {
      setLoadingCards(true);
      const data = await cardsApi.list(search || undefined);
      setCards(data);
    } catch (err) {
      console.error('Failed to load cards:', err);
    } finally {
      setLoadingCards(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCards();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      company: '',
      title: '',
      phone: '',
      mobile: '',
      email: '',
      address: '',
    });
    setEditingCard(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCard) {
        await cardsApi.update(editingCard.id, formData);
      } else {
        await cardsApi.create(formData);
      }
      resetForm();
      loadCards();
    } catch (err) {
      console.error('Failed to save card:', err);
      alert('儲存失敗');
    }
  };

  const handleEdit = (card: Card) => {
    setFormData({
      name: card.name || '',
      company: card.company || '',
      title: card.title || '',
      phone: card.phone || '',
      mobile: card.mobile || '',
      email: card.email || '',
      address: card.address || '',
    });
    setEditingCard(card);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這張名片嗎？')) return;
    try {
      await cardsApi.delete(id);
      loadCards();
    } catch (err) {
      console.error('Failed to delete card:', err);
      alert('刪除失敗');
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">名片管理</h1>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/tags')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            >
              標籤管理
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
        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋姓名、公司、職稱..."
              className="flex-1 shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              搜尋
            </button>
            <button
              type="button"
              onClick={() => { setSearch(''); loadCards(); }}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              清除
            </button>
          </form>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">
              {editingCard ? '編輯名片' : '新增名片'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">姓名</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">公司</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">職稱</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">電話</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">手機</label>
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-700 text-sm font-bold mb-2">地址</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="md:col-span-2 flex gap-4">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded"
                >
                  {editingCard ? '更新' : '新增'}
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
        )}

        {/* Add Button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded mb-6"
          >
            + 新增名片
          </button>
        )}

        {/* Cards List */}
        {loadingCards ? (
          <p>載入中...</p>
        ) : cards.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            尚無名片資料
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => (
              <div key={card.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{card.name || '(未填寫)'}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(card)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => handleDelete(card.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      刪除
                    </button>
                  </div>
                </div>
                <p className="text-gray-600">{card.company || ''} {card.title ? `| ${card.title}` : ''}</p>
                <p className="text-gray-500 text-sm mt-2">
                  {card.phone ? `☎ ${card.phone}` : ''}
                  {card.mobile ? ` | 📱 ${card.mobile}` : ''}
                </p>
                <p className="text-gray-500 text-sm">
                  {card.email ? `✉ ${card.email}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}