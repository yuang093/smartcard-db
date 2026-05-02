'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import api from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";

interface ParsedCard {
  name?: string | null;
  company?: string | null;
  title?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  suggested_tags?: string[];
  front_image_url?: string | null;
  back_image_url?: string | null;
  _parse_error?: string;
  _front_preview?: string | null;
  _back_preview?: string | null;
}

export default function ReviewPage() {
  const router = useRouter();
  const [data, setData] = useState<ParsedCard | null>(null);
  const [imageUrls, setImageUrls] = useState({ front: "", back: "" });
  const [form, setForm] = useState({
    name: "",
    company: "",
    title: "",
    phone: "",
    mobile: "",
    email: "",
    address: "",
  });
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch all tags
  useEffect(() => {
    api.get("/api/v1/tags").then((res) => {
      setAllTags(res.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem("parsed_card");
    if (!stored) {
      toast.error("找不到上傳資料，請重新上傳");
      router.replace("/cards/upload");
      return;
    }
    try {
      const parsed: ParsedCard = JSON.parse(stored);
      setData(parsed);
      setImageUrls({
        front: parsed.front_image_url || parsed._front_preview || "",
        back: parsed.back_image_url || parsed._back_preview || "",
      });
      setForm({
        name: parsed.name || "",
        company: parsed.company || "",
        title: parsed.title || "",
        phone: parsed.phone || "",
        mobile: parsed.mobile || "",
        email: parsed.email || "",
        address: parsed.address || "",
      });
    } catch {
      toast.error("資料讀取失敗，請重新上傳");
      router.replace("/cards/upload");
    }
  }, [router]);

  // When allTags loads, auto-select tags matching AI suggestions
  useEffect(() => {
    if (!data?.suggested_tags?.length || !allTags.length) return;
    const matched = allTags
      .filter((t) => data.suggested_tags!.some((s) => t.name.toLowerCase().includes(s.toLowerCase())))
      .map((t) => t.id);
    setSelectedTagIds(matched);
  }, [data, allTags]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("姓名為必填欄位");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/api/v1/cards", {
        ...form,
        front_image_url: imageUrls.front || null,
        back_image_url: imageUrls.back || null,
        tag_ids: selectedTagIds,
      });
      sessionStorage.removeItem("parsed_card");
      toast.success("名片已儲存！");
      router.push("/cards");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "儲存失敗，請稍後再試";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #f5576c)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 10s ease infinite',
      }}>
        <div style={{ width: '3rem', height: '3rem', border: '4px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <Toaster position="top center" />

      {/* Header */}
      <header style={{ background: 'var(--header-bg)', boxShadow: '0 1px 3px var(--shadow-color)', borderBottom: '1px solid var(--header-border)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', background: 'linear-gradient(-45deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 8h6M7 12h10M7 16h4"/></svg>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>📋 人工校對</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <ThemeToggle />
            <button
              onClick={() => router.push('/cards')}
              style={{ padding: '0.5rem 0.875rem', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: '600', borderRadius: '0.625rem', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.8125rem' }}
            >
              ← 返回名片
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '36rem', margin: '0 auto', padding: '1.5rem' }}>
        {/* Image preview */}
        {(imageUrls.front || imageUrls.back) && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            {imageUrls.front && (
              <div style={{ position: 'relative', width: '8rem', height: '5rem', borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/v1/static/${imageUrls.front.split("/").pop()}`}
                  alt="名片正面"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', padding: '0.25rem 0.5rem', fontSize: '0.6875rem', color: 'white', fontWeight: '600' }}>正面</div>
              </div>
            )}
            {imageUrls.back && (
              <div style={{ position: 'relative', width: '8rem', height: '5rem', borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/v1/static/${imageUrls.back.split("/").pop()}`}
                  alt="名片背面"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', padding: '0.25rem 0.5rem', fontSize: '0.6875rem', color: 'white', fontWeight: '600' }}>背面</div>
              </div>
            )}
          </div>
        )}

        {/* Form Card */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '1.5rem', boxShadow: '0 4px 6px -1px var(--shadow-color), 0 0 0 1px var(--border-color)', padding: '1.5rem', animation: 'slideUp 0.3s ease-out' }}>
          {/* AI error badge */}
          {data._parse_error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.625rem 1rem', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>⚠️</span>
              <span style={{ fontSize: '0.8125rem', color: '#D97706', fontWeight: '600' }}>AI 辨識不完整，請自行填寫或修正</span>
            </div>
          )}

          {/* AI suggested tags */}
          {data.suggested_tags && data.suggested_tags.length > 0 && (
            <div style={{ marginBottom: '1.5rem', padding: '0.875rem', background: 'rgba(102, 126, 234, 0.08)', borderRadius: '1rem', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
              <p style={{ fontSize: '0.6875rem', color: '#667eea', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>✨ AI 建議標籤</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {data.suggested_tags.map((tag, i) => (
                  <span key={i} style={{ padding: '0.25rem 0.75rem', background: 'rgba(102, 126, 234, 0.15)', color: '#667eea', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tag selection (all tags) */}
          {allTags.length > 0 && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--input-bg)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>🏷️ 選擇標籤</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {allTags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      style={{
                        padding: '0.375rem 0.875rem',
                        borderRadius: '9999px',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        border: `1.5px solid ${selected ? tag.color : 'var(--border-color)'}`,
                        background: selected ? tag.color + '20' : 'transparent',
                        color: selected ? tag.color : 'var(--text-secondary)',
                        transition: 'all 0.2s',
                        transform: selected ? 'scale(1.05)' : 'scale(1)',
                      }}
                    >
                      {selected ? '✓ ' : ''}{tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form fields */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { key: "name", label: "姓名", required: true },
              { key: "company", label: "公司" },
              { key: "title", label: "職稱" },
              { key: "phone", label: "公司電話" },
              { key: "mobile", label: "手機" },
              { key: "email", label: "Email" },
              { key: "address", label: "地址" },
            ].map(({ key, label, required }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                  {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
                </label>
                <input
                  type={key === "email" ? "email" : "text"}
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={label}
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '0.75rem', fontSize: '0.9375rem', background: 'var(--input-bg)', color: 'var(--text-primary)', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                  onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.15)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            ))}

            {/* Error */}
            {error && (
              <div style={{ padding: '0.875rem', background: 'var(--error-bg)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.75rem', fontSize: '0.875rem', color: '#EF4444', fontWeight: '500' }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => router.back()}
                style={{ flex: 1, padding: '0.875rem', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontWeight: '600', borderRadius: '0.75rem', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.9375rem', transition: 'all 0.2s' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; }}
              >
                ✕ 取消
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{ flex: 1, padding: '0.875rem', background: loading ? '#9CA3AF' : 'linear-gradient(-45deg, #667eea, #764ba2)', color: 'white', fontWeight: '700', borderRadius: '0.75rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.9375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: loading ? 'none' : '0 4px 15px rgba(102,126,234,0.35)', transition: 'all 0.3s' }}
                onMouseOver={(e) => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(102,126,234,0.5)'; } }}
                onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = loading ? 'none' : '0 4px 15px rgba(102,126,234,0.35)'; }}
              >
                {loading ? (
                  <>
                    <div style={{ width: '1rem', height: '1rem', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    儲存中...
                  </>
                ) : (
                  '💾 儲存名片'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}