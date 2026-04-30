'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { cardsApi, Card, DuplicateWarning } from '@/lib/api';
import { tagsApi } from '@/lib/api';

export default function CardsPage() {
  const { isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [search, setSearch] = useState('');
  const [loadingCards, setLoadingCards] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateWarning[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [pendingCard, setPendingCard] = useState<Partial<Card> | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<{ id: string; name: string; color: string }[]>([]);

  // Fetch all tags for the selector
  useEffect(() => {
    async function fetchTags() {
      try {
        const tags = await tagsApi.list();
        setAllTags(tags);
      } catch (e) {
        console.error('Failed to fetch tags', e);
      }
    }
    fetchTags();
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    title: '',
    phone: '',
    mobile: '',
    email: '',
    address: '',
    tag_ids: [] as string[],
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

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
    });
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
    
    // If creating new card, check for duplicates first
    if (!editingCard && formData.name) {
      try {
        const dupes = await cardsApi.checkDuplicates(formData.name, formData.company);
        if (dupes && dupes.length > 0) {
          setDuplicates(dupes);
          setPendingCard(formData);
          setShowDuplicateWarning(true);
          return;
        }
      } catch (err) {
        console.error('Failed to check duplicates:', err);
      }
    }
    
    try {
      if (editingCard) {
        await cardsApi.update(editingCard.id, formData);
      } else {
        // Check for duplicates first
        if (formData.name) {
          const dupes = await cardsApi.checkDuplicates(formData.name, formData.company);
          if (dupes && dupes.length > 0) {
            setDuplicates(dupes);
            setPendingCard(formData);
            setShowDuplicateWarning(true);
            return;
          }
        }
        await cardsApi.create(formData);
      }
      resetForm();
      loadCards();
    } catch (err) {
      console.error('Failed to save card:', err);
      alert(err instanceof Error ? err.message : 'Failed to save card');
    }
  };

  const handleDuplicateConfirm = async () => {
    if (!pendingCard) return;
    try {
      await cardsApi.create(pendingCard);
      setShowDuplicateWarning(false);
      setPendingCard(null);
      setDuplicates([]);
      resetForm();
      loadCards();
    } catch (err) {
      // If backend also detects duplicate (user already confirmed), treat as success
      if (err instanceof Error && err.message.includes('此名片資料已存在')) {
        setShowDuplicateWarning(false);
        setPendingCard(null);
        setDuplicates([]);
        resetForm();
        loadCards();
      } else {
        console.error('Failed to save card:', err);
        alert('Failed to save card');
      }
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

  const handleViewDetail = (card: Card) => {
    setDetailCard(card);
    setShowDetailModal(true);
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

  const handleDownloadVCard = (card: Card) => {
    // Generate vCard format
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${card.name || ''}`,
      `N:${card.name || ''};;;`,
      card.company ? `ORG:${card.company}` : '',
      card.title ? `TITLE:${card.title}` : '',
      card.phone ? `TEL;TYPE=WORK,VOICE:${card.phone}` : '',
      card.mobile ? `TEL;TYPE=CELL,VOICE:${card.mobile}` : '',
      card.email ? `EMAIL:${card.email}` : '',
      card.address ? `ADR;TYPE=WORK:;;${card.address};;;;` : '',
      'END:VCARD',
    ].filter(line => line !== '');

    const vcardContent = lines.join('\r\n');
    const blob = new Blob([vcardContent], { type: 'text/vcard;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `${(card.name || 'contact').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.vcf`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleExport = async () => {
    try {
      // Get token from localStorage
      const auth = localStorage.getItem('smartcard_auth');
      const token = auth ? JSON.parse(auth).token : '';
      
      const response = await fetch('/api/v1/exports/export', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('匯出失敗');
      }
      
      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cards_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
      alert('匯出失敗，請稍後再試');
    }
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
              onClick={handleExport}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              匯出 Excel
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
              {/* 標籤選擇 */}
              <div className="md:col-span-2">
                <label className="block text-gray-700 text-sm font-bold mb-2">標籤</label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <label key={tag.id} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.tag_ids.includes(tag.id)}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...formData.tag_ids, tag.id]
                            : formData.tag_ids.filter((id) => id !== tag.id);
                          setFormData({ ...formData, tag_ids: ids });
                        }}
                        className="rounded"
                      />
                      <span
                        className="px-2 py-1 rounded-full text-xs"
                        style={{ backgroundColor: tag.color + '30', color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    </label>
                  ))}
                </div>
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

        {/* Add Button - AI 上傳優先 */}
        {!showAddForm && (
          <div className="mb-6">
            <button
              onClick={() => router.push('/cards/upload')}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded flex items-center gap-2 mx-auto"
            >
              📷 新增名片（AI 辨識）
            </button>
          </div>
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
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleDownloadVCard(card)}
                      className="text-green-600 hover:text-green-800 text-sm"
                    >
                      vCard
                    </button>
                    <button
                      onClick={() => handleViewDetail(card)}
                      className="text-purple-600 hover:text-purple-800 text-sm"
                    >
                      詳情
                    </button>
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

        {/* Duplicate Warning Modal */}
        {showDuplicateWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-yellow-600 mb-4">Warning: Duplicate Card</h3>
              <p className="text-gray-700 mb-4">
                A card with the same name and company already exists:
              </p>
              {duplicates.map((dup, idx) => (
                <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-2">
                  <p className="font-medium">"{dup.name}" @ "{dup.company}"</p>
                  <p className="text-sm text-gray-600">{dup.count} cards found</p>
                </div>
              ))}
              <p className="text-gray-700 mb-4">
                Do you want to add this card anyway?
              </p>
              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => {
                    setShowDuplicateWarning(false);
                    setPendingCard(null);
                    setDuplicates([]);
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDuplicateConfirm}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded"
                >
                  Add Anyway
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && detailCard && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">名片詳情</h2>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                {/* 圖片顯示 */}
                {(detailCard.front_image_url || detailCard.back_image_url) && (
                  <div className="mb-4 flex gap-4 flex-wrap">
                    {detailCard.front_image_url && (
                      <div className="flex-1 min-w-[120px]">
                        <p className="text-sm font-medium text-gray-700 mb-1">正面</p>
                        <img
                          src={`/api/v1/static/${detailCard.front_image_url}`}
                          alt="名片正面"
                          className="w-full border rounded-lg"
                        />
                      </div>
                    )}
                    {detailCard.back_image_url && (
                      <div className="flex-1 min-w-[120px]">
                        <p className="text-sm font-medium text-gray-700 mb-1">背面</p>
                        <img
                          src={`/api/v1/static/${detailCard.back_image_url}`}
                          alt="名片背面"
                          className="w-full border rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 基本資訊 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">{detailCard.name || '(未填寫)'}</span>
                  </div>
                  {(detailCard.company || detailCard.title) && (
                    <p className="text-gray-600">
                      {detailCard.company || ''} {detailCard.title ? `| ${detailCard.title}` : ''}
                    </p>
                  )}
                </div>

                {/* 聯絡方式 */}
                <div className="mt-4 space-y-2">
                  {(detailCard.phone || detailCard.mobile) && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">☎</span>
                      <span className="text-gray-800">{detailCard.phone || ''}</span>
                      {detailCard.mobile && <span className="text-gray-500">| 📱 {detailCard.mobile}</span>}
                      {(detailCard.phone || detailCard.mobile) && (
                        <button
                          onClick={() => handleCopy((detailCard.phone || '') + (detailCard.mobile ? ' ' + detailCard.mobile : ''), 'phone')}
                          className="ml-auto text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded transition-colors"
                        >
                          {copySuccess === 'phone' ? '✅ 已複製' : '複製電話'}
                        </button>
                      )}
                    </div>
                  )}
                  {detailCard.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">✉</span>
                      <span className="text-gray-800">{detailCard.email}</span>
                      <button
                        onClick={() => handleCopy(detailCard.email!, 'email')}
                        className="ml-auto text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded transition-colors"
                      >
                        {copySuccess === 'email' ? '✅ 已複製' : '複製Email'}
                      </button>
                    </div>
                  )}
                  {detailCard.address && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500">📍</span>
                      <span className="text-gray-800">{detailCard.address}</span>
                    </div>
                  )}
                </div>

                {/* 底部按鈕 */}
                <div className="mt-6 flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleEdit(detailCard);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition-colors"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded transition-colors"
                  >
                    關閉
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}