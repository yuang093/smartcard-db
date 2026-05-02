'use client';

import React, { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { cardsApi, Card, DuplicateWarning } from '@/lib/api';
import { tagsApi } from '@/lib/api';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';

function AdminButton() {
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem('smartcard_auth') || '{}');
    if (!auth.token) return;
    fetch(`/api/v1/auth/me`, {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data?.is_admin) setIsAdminUser(true);
      })
      .catch(() => {});
  }, []);

  if (!isAdminUser) return null;
  return (
    <button
      onClick={() => window.location.href = '/setup'}
      style={{ padding: '0.625rem 1rem', background: '#DC2626', color: 'white', fontWeight: '600', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem', transition: 'all 0.2s' }}
      onMouseOver={(e) => { e.currentTarget.style.background = '#B91C1C'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseOut={(e) => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      ⚙️ 管理
    </button>
  );
}

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
  const [exporting, setExporting] = useState(false);
  const [pendingCard, setPendingCard] = useState<Partial<Card> | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [showBatchBar, setShowBatchBar] = useState(false);

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
      loadAllTags();
    }
  }, [isAuthenticated, selectedTagFilter]);

  const loadCards = async () => {
    try {
      setLoadingCards(true);
      const data = await cardsApi.list(search || undefined, selectedTagFilter || undefined);
      setCards(data);
      setSelectedCards(new Set()); // Clear batch selection on reload
      setShowBatchBar(false);
    } catch (err) {
      console.error('Failed to load cards:', err);
    } finally {
      setLoadingCards(false);
    }
  };

  const loadAllTags = async () => {
    try {
      const tags = await tagsApi.list();
      setAllTags(tags);
    } catch (err) {
      console.error('Failed to load tags:', err);
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
      console.log('[DEBUG] Submitting card with formData:', JSON.stringify(formData));
      if (editingCard) {
        console.log('[DEBUG] Updating card:', editingCard.id, 'with tag_ids:', formData.tag_ids);
        await cardsApi.update(editingCard.id, formData);
        console.log('[DEBUG] Update successful');
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
      notes: (card as any).notes || '',
      tag_ids: card.tags?.map((t: { id: string }) => t.id) || [],
    });
    setEditingCard(card);
    setShowAddForm(true);
  };

  const handleViewDetail = (card: Card) => {
    console.log('handleViewDetail BEFORE setState:', {cardId: card?.id, cardName: card?.name, showDetailModal, hasDetailCard: !!detailCard});
    setDetailCard(card);
    console.log('handleViewDetail AFTER setDetailCard');
    setShowDetailModal(true);
    setCopySuccess(null);
    console.log('handleViewDetail AFTER setShowDetailModal, will trigger re-render');
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
    if (exporting) return; // Prevent double-click
    try {
      setExporting(true);
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
    } finally {
      setExporting(false);
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
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <header style={{ background: 'var(--header-bg)', boxShadow: '0 1px 3px var(--shadow-color)', borderBottom: '1px solid var(--header-border)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', background: 'linear-gradient(-45deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 8h6M7 12h10M7 16h4"/></svg>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>名片管理</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <ThemeToggle />
            <AdminButton />
            <button
              onClick={() => router.push('/tags')}
              style={{ padding: '0.625rem 1rem', background: '#9333EA', color: 'white', fontWeight: '600', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem', transition: 'all 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#7E22CE'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#9333EA'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              🏷️ 標籤管理
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{ padding: '0.625rem 1rem', background: exporting ? '#9CA3AF' : '#10B981', color: 'white', fontWeight: '600', borderRadius: '0.75rem', border: 'none', cursor: exporting ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem', transition: 'all 0.2s', boxShadow: exporting ? 'none' : '0 2px 6px rgba(16,185,129,0.3)' }}
              onMouseOver={(e) => { if (!exporting) { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseOut={(e) => { if (!exporting) { e.currentTarget.style.background = '#10B981'; e.currentTarget.style.transform = 'translateY(0)'; } }}
            >
              {exporting ? '⏳ 匯出中...' : '📥 匯出 Excel'}
            </button>
            <button
              onClick={handleLogout}
              style={{ padding: '0.625rem 1rem', background: '#EF4444', color: 'white', fontWeight: '600', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', transition: 'all 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#EF4444'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              🚪 登出
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: '1.5rem' }}>
        {/* Search Bar */}
        <div style={{ background: 'white', borderRadius: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <form onSubmit={handleSearch} className="flex flex-wrap gap-2 sm:gap-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋姓名、公司、職稱..."
              className="flex-1 min-w-[120px] shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 sm:px-4 rounded text-sm sm:text-base"
            >
              搜尋
            </button>
            <button
              type="button"
              onClick={() => { setSearch(''); setSelectedTagFilter(''); loadCards(); }}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-3 sm:px-4 rounded text-sm sm:text-base"
            >
              清除
            </button>
            {allTags.length > 0 && (
              <select
                value={selectedTagFilter}
                onChange={(e) => {
                  setSelectedTagFilter(e.target.value);
                  loadCards();
                }}
                className="shadow border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
              >
                <option value="">全部標籤</option>
                {allTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            )}
          </form>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div style={{ background: 'white', borderRadius: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)', padding: '1.5rem', marginBottom: '1.5rem', animation: 'slideUp 0.3s ease-out' }}>
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

        {/* Batch Action Bar */}
        {showBatchBar && selectedCards.size > 0 && (
          <div style={{ background: 'linear-gradient(135deg, #DBEAFE, #EEF2FF)', borderRadius: '1rem', padding: '1rem 1.25rem', marginBottom: '1rem', border: '1px solid #BFDBFE', boxShadow: '0 2px 8px rgba(59,130,246,0.15)' }}>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontWeight: '700', color: '#1E40AF', fontSize: '0.9375rem' }}>已選擇 {selectedCards.size} 張名片</span>
                <button
                  onClick={() => { setSelectedCards(new Set()); setShowBatchBar(false); }}
                  style={{ color: '#2563EB', fontSize: '0.8125rem', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  取消選擇
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              {/* Batch Add Tags */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                <span className="text-sm text-gray-700 whitespace-nowrap">新增標籤：</span>
                <select
                  id="batch-add-tag"
                  className="border rounded px-2 py-1 text-sm w-full sm:w-auto min-w-[120px]"
                  defaultValue=""
                >
                  <option value="">選擇標籤</option>
                  {allTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
                <button
                  onClick={async () => {
                    const selectEl = document.getElementById('batch-add-tag') as HTMLSelectElement;
                    const tagId = selectEl?.value;
                    if (!tagId) return;
                    try {
                      await fetch('/api/v1/cards/batch-add-tags', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('smartcard_auth') ? JSON.parse(localStorage.getItem('smartcard_auth')!).token : ''}` },
                        body: JSON.stringify({ card_ids: Array.from(selectedCards), tag_ids: [tagId] }),
                      });
                      loadCards();
                    } catch (err) {
                      console.error('Batch add tags failed:', err);
                    }
                  }}
                  style={{ background: '#2563EB', color: 'white', fontSize: '0.8125rem', padding: '0.375rem 0.75rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', width: '100%' }}
                >
                  套用
                </button>
              </div>
              {/* Batch Remove Tags */}
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8125rem', color: '#374151', whiteSpace: 'nowrap' }}>移除標籤：</span>
                <select
                  id="batch-remove-tag"
                  style={{ border: '1px solid #D1D5DB', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', fontSize: '0.8125rem', width: '100%' }}
                  defaultValue=""
                >
                  <option value="">選擇標籤</option>
                  {allTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
                <button
                  onClick={async () => {
                    const selectEl = document.getElementById('batch-remove-tag') as HTMLSelectElement;
                    const tagId = selectEl?.value;
                    if (!tagId) return;
                    try {
                      await fetch('/api/v1/cards/batch-remove-tags', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('smartcard_auth') ? JSON.parse(localStorage.getItem('smartcard_auth')!).token : ''}` },
                        body: JSON.stringify({ card_ids: Array.from(selectedCards), tag_ids: [tagId] }),
                      });
                      loadCards();
                    } catch (err) {
                      console.error('Batch remove tags failed:', err);
                    }
                  }}
                  style={{ background: '#D97706', color: 'white', fontSize: '0.8125rem', padding: '0.375rem 0.75rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', width: '100%' }}
                >
                  套用
                </button>
              </div>
              {/* Batch Delete */}
              <button
                onClick={async () => {
                  if (!confirm(`確定要刪除選定的 ${selectedCards.size} 張名片嗎？此操作無法復原。`)) return;
                  try {
                    await fetch('/api/v1/cards/batch-delete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('smartcard_auth') ? JSON.parse(localStorage.getItem('smartcard_auth')!).token : ''}` },
                      body: JSON.stringify({ card_ids: Array.from(selectedCards) }),
                    });
                    loadCards();
                  } catch (err) {
                    console.error('Batch delete failed:', err);
                  }
                }}
                style={{ background: '#DC2626', color: 'white', fontSize: '0.8125rem', padding: '0.375rem 0.75rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
              >
                🗑️ 批次刪除
              </button>
            </div>
          </div>
        )}

        {/* Add Button - AI 上傳優先 */}
        {!showAddForm && (
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={() => router.push('/cards/upload')}
              style={{ width: '100%', maxWidth: '360px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem', padding: '1rem 1.5rem', background: 'linear-gradient(-45deg, #10B981, #059669)', color: 'white', fontWeight: '700', borderRadius: '1rem', border: 'none', cursor: 'pointer', fontSize: '1rem', boxShadow: '0 4px 14px rgba(16,185,129,0.35)', transition: 'all 0.3s' }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(16,185,129,0.45)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(16,185,129,0.35)'; }}
            >
              📷 新增名片（AI 辨識）
            </button>
          </div>
        )}

        {/* Cards List */}
        {loadingCards ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#667eea', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : cards.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            尚無名片資料
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {cards.map((card) => (
              <div key={card.id} className={`bg-white rounded-lg shadow p-4 relative ${selectedCards.has(card.id) ? 'ring-4 ring-blue-500' : ''}`}>
                {/* Checkbox for batch selection */}
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    checked={selectedCards.has(card.id)}
                    onChange={() => {
                      const newSelected = new Set(selectedCards);
                      if (newSelected.has(card.id)) {
                        newSelected.delete(card.id);
                      } else {
                        newSelected.add(card.id);
                      }
                      setSelectedCards(newSelected);
                      setShowBatchBar(newSelected.size > 0);
                    }}
                    className="w-5 h-5 rounded cursor-pointer"
                  />
                </div>
                <div className="flex justify-between items-start mb-2 pl-8">
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
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#B45309', marginBottom: '1rem' }}>⚠️ 檢查到重複名片</h3>
              <p style={{ fontSize: '0.9375rem', color: '#374151', marginBottom: '1rem' }}>已有相同姓名和公司的名片存在：</p>
              {duplicates.map((dup, idx) => (
                <div key={idx} style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '0.75rem', padding: '0.75rem', marginBottom: '0.5rem' }}>
                  <p style={{ fontWeight: '600', color: '#92400E' }}>「{dup.name}」@ 「{dup.company}」</p>
                  <p style={{ fontSize: '0.8125rem', color: '#B45309' }}>找到 {dup.count} 張相似名片</p>
                </div>
              ))}
              <p style={{ fontSize: '0.9375rem', color: '#374151', marginBottom: '1.25rem' }}>仍然要新增這張名片嗎？</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setShowDuplicateWarning(false); setPendingCard(null); setDuplicates([]); }}
                  style={{ background: '#E5E7EB', color: '#374151', fontWeight: '600', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  取消
                </button>
                <button
                  onClick={handleDuplicateConfirm}
                  style={{ background: '#F59E0B', color: 'white', fontWeight: '600', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  仍然新增
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && detailCard && (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setShowDetailModal(false); }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 99999, background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1rem', animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div style={{
              background: 'white', borderRadius: '1rem',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
              width: '100%', maxWidth: '30rem', maxHeight: '92vh',
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
              animation: 'slideUp 0.25s ease-out'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1.25rem 1.5rem', borderBottom: '1px solid #F3F4F6',
                background: 'linear-gradient(to right, #EEF2FF, white)'
              }}>
                <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                  <div style={{
                    width: '2.5rem', height: '2.5rem', borderRadius: '9999px',
                    background: '#E0E7FF', display:'flex',alignItems:'center',justifyContent:'center'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <div>
                    <h2 style={{fontSize: '1.125rem', fontWeight: '700', color: '#111827'}}>名片詳情</h2>
                    <p style={{fontSize:'0.75rem',color:'#9CA3AF'}}>ID: {(detailCard.id || '').slice(0,8)}...</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  style={{
                    width: '2.5rem', height: '2.5rem', borderRadius: '9999px',
                    background: '#F3F4F6', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#6B7280', fontSize: '1.25rem', transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#E5E7EB')}
                  onMouseOut={(e) => (e.currentTarget.style.background = '#F3F4F6')}
                >×</button>
              </div>

              {/* Scrollable Body */}
              <div style={{overflow: 'auto', flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>

                {/* 基本資訊卡片 */}
                <div style={{
                  background: 'linear-gradient(135deg, #EEF2FF, #DBEAFE)',
                  borderRadius: '1rem', padding: '1.25rem', border: '1px solid #C7D2FE',
                  display: 'flex', alignItems: 'flex-start', gap: '1rem'
                }}>
                  <div style={{
                    width: '3rem', height: '3rem', borderRadius: '0.75rem',
                    background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <div style={{flex: 1, minWidth: 0}}>
                    <h3 style={{fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '0.25rem'}}>{detailCard.name || '(未填寫)'}</h3>
                    {(detailCard.company || detailCard.title) && (
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap'}}>
                        {detailCard.company && (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 10v11M16 10v11"/></svg>
                            <span style={{fontSize: '0.875rem', color: '#4B5563'}}>{detailCard.company}</span>
                          </>
                        )}
                        {detailCard.title && (
                          <>
                            <span style={{color: '#D1D5DB'}}>•</span>
                            <span style={{fontSize: '0.875rem', color: '#6B7280'}}>{detailCard.title}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 標籤 */}
                {detailCard.tags && detailCard.tags.length > 0 && (
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem'}}>
                    {detailCard.tags.map((tag) => (
                      <span key={tag.id} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        padding: '0.375rem 0.75rem', borderRadius: '9999px',
                        fontSize: '0.75rem', fontWeight: '600',
                        background: tag.color + '20', color: tag.color,
                        border: `1px solid ${tag.color}30`,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/></svg>
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* 聯絡資訊 */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                  <h4 style={{fontSize: '0.75rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em'}}>聯絡資訊</h4>

                  {(detailCard.phone || detailCard.mobile) && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '1rem', background: 'white', borderRadius: '0.75rem',
                      border: '1px solid #F3F4F6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s', gap: '0.75rem'
                    }}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0}}>
                        <div style={{
                          width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem',
                          background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        </div>
                        <div style={{minWidth: 0}}>
                          <p style={{fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '0.125rem'}}>電話</p>
                          <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.75rem'}}>
                            {detailCard.phone && (
                              <a href={`tel:${detailCard.phone}`} style={{fontSize: '0.875rem', fontWeight: '600', color: '#111827'}}>{detailCard.phone}</a>
                            )}
                            {detailCard.mobile && (
                              <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                                <span style={{fontSize: '0.875rem', color: '#4B5563'}}>{detailCard.mobile}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopy((detailCard.phone||'')+(detailCard.mobile?' '+detailCard.mobile:''), 'phone')}
                        style={{
                          flexShrink: 0, height: '2.5rem', paddingLeft: '1rem', paddingRight: '1rem',
                          borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: '600',
                          border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                          background: copySuccess === 'phone' ? '#D1FAE5' : '#2563EB',
                          color: copySuccess === 'phone' ? '#065F46' : 'white',
                          display: 'flex', alignItems: 'center', gap: '0.375rem'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        {copySuccess === 'phone' ? '已複製' : '複製'}
                      </button>
                    </div>
                  )}

                  {detailCard.email && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '1rem', background: 'white', borderRadius: '0.75rem',
                      border: '1px solid #F3F4F6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s', gap: '0.75rem'
                    }}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0}}>
                        <div style={{
                          width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem',
                          background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        </div>
                        <div style={{minWidth: 0}}>
                          <p style={{fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '0.125rem'}}>Email</p>
                          <a href={`mailto:${detailCard.email}`} style={{fontSize: '0.875rem', fontWeight: '600', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block'}}>{detailCard.email}</a>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopy(detailCard.email, 'email')}
                        style={{
                          flexShrink: 0, height: '2.5rem', paddingLeft: '1rem', paddingRight: '1rem',
                          borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: '600',
                          border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                          background: copySuccess === 'email' ? '#D1FAE5' : '#7C3AED',
                          color: copySuccess === 'email' ? '#065F46' : 'white',
                          display: 'flex', alignItems: 'center', gap: '0.375rem'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        {copySuccess === 'email' ? '已複製' : '複製'}
                      </button>
                    </div>
                  )}

                  {detailCard.address && (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                      padding: '1rem', background: 'white', borderRadius: '0.75rem',
                      border: '1px solid #F3F4F6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s'
                    }}>
                      <div style={{
                        width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem',
                        background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      </div>
                      <div>
                        <p style={{fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '0.125rem'}}>地址</p>
                        <p style={{fontSize: '0.875rem', color: '#374151', lineHeight: 1.6}}>{detailCard.address}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 備註 */}
                {detailCard.notes && (
                  <div style={{
                    background: '#FFFBEB', borderRadius: '1rem', padding: '1.25rem',
                    border: '1px solid #FDE68A'
                  }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      <h4 style={{fontSize: '0.875rem', fontWeight: '600', color: '#B45309'}}>備註</h4>
                    </div>
                    <p style={{fontSize: '0.875rem', color: '#92400E', lineHeight: 1.6, whiteSpace: 'pre-wrap'}}>{detailCard.notes}</p>
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div style={{
                padding: '1rem 1.5rem', borderTop: '1px solid #F3F4F6',
                background: '#F9FAFB', display: 'flex', gap: '0.75rem'
              }}>
                <button
                  onClick={() => { setShowDetailModal(false); handleEdit(detailCard); }}
                  style={{
                    flex: 1, height: '3rem', background: '#4F46E5', color: 'white',
                    fontWeight: '600', borderRadius: '0.75rem', border: 'none',
                    cursor: 'pointer', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    boxShadow: '0 1px 3px rgba(79,70,229,0.3)'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  編輯名片
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  style={{
                    height: '3rem', paddingLeft: '1.5rem', paddingRight: '1.5rem',
                    background: '#E5E7EB', color: '#374151', fontWeight: '500',
                    borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >關閉</button>
              </div>
            </div>
          </div>
        )}
      </main>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}