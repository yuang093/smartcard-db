'use client';

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import type { CardUploadResponse } from "@/types";
import ThemeToggle from "@/components/ThemeToggle";

async function compressImage(file: File, maxSizeBytes: number = 500 * 1024): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_DIM = 1200;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round(height * MAX_DIM / width);
          width = MAX_DIM;
        } else {
          width = Math.round(width * MAX_DIM / height);
          height = MAX_DIM;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      const tryCompress = (q: number): Promise<Blob | null> =>
        new Promise((res) => canvas.toBlob((b) => res(b), 'image/jpeg', q));

      const attempt = async () => {
        for (let q = 0.85; q >= 0.4; q -= 0.1) {
          const b = await tryCompress(q);
          if (b && b.size <= maxSizeBytes) {
            resolve(new File([b], file.name, { type: 'image/jpeg' }));
            return;
          }
        }
        const b = await tryCompress(0.4);
        if (b) resolve(new File([b], file.name, { type: 'image/jpeg' }));
        else resolve(file);
      };
      attempt();
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

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

export default function UploadPage() {
  const router = useRouter();
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleFrontChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFrontFile(file);
    setFrontPreview(URL.createObjectURL(file));
    setError("");
  }

  function handleBackChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackFile(file);
    setBackPreview(URL.createObjectURL(file));
  }

  function clearBack() {
    setBackFile(null);
    setBackPreview(null);
    if (backInputRef.current) backInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!frontFile) {
      toast.error("請選擇名片正面圖片");
      return;
    }

    setLoading(true);
    toast.loading("📤 上傳中，請稍候...", { id: "upload-toast", duration: 999999 });

    try {
      let frontToSend = frontFile;
      let backToSend = backFile;
      try {
        frontToSend = await compressImage(frontFile, 500 * 1024);
        if (backFile) backToSend = await compressImage(backFile, 500 * 1024);
      } catch (cmpErr) {
        console.warn("Compression failed:", cmpErr);
      }

      const formData = new FormData();
      formData.append("front", frontToSend);
      if (backToSend) formData.append("back", backToSend);

      const token = localStorage.getItem("smartcard_auth")
        ? JSON.parse(localStorage.getItem("smartcard_auth")!).token
        : null;

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/v1/cards/upload_and_parse", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.detail) errMsg = String(errData.detail);
        } catch {}
        throw new Error(errMsg);
      }

      const data: CardUploadResponse = await res.json();
      const parsed: ParsedCard = data.parsed || {};

      if (!parsed.name && !parsed.company && !parsed.email && !parsed._parse_error) {
        throw new Error("AI 辨識失敗，請重試或手動輸入");
      }

      if (parsed._parse_error) {
        throw new Error("AI 辨識失敗：" + parsed._parse_error);
      }

      const frontPreviewUrl = frontPreview || URL.createObjectURL(frontFile);
      const backPreviewUrl = backFile ? (backPreview || URL.createObjectURL(backFile)) : null;

      sessionStorage.setItem(
        "parsed_card",
        JSON.stringify({
          ...parsed,
          front_image_url: data.front_image_url,
          back_image_url: data.back_image_url,
          _front_preview: frontPreviewUrl,
          _back_preview: backPreviewUrl,
        })
      );

      toast.success("✨ AI 辨識完成！", { id: "upload-toast" });
      router.push("/cards/review");
    } catch (err: unknown) {
      toast.dismiss("upload-toast");
      const errMsg = err instanceof Error ? err.message : "上傳失敗";
      setError(errMsg);
      toast.error(errMsg);
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #f5576c)',
      backgroundSize: '400% 400%',
      animation: 'gradientShift 10s ease infinite',
    }}>
      <Toaster position="top center" toastOptions={{ duration: 3000 }} />

      {/* Floating blobs */}
      <div style={{ position: 'fixed', top: '-10%', right: '-5%', width: '400px', height: '400px', borderRadius: '50%', opacity: 0.3, background: '#f093fb', filter: 'blur(60px)', animation: 'float1 8s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10%', left: '-5%', width: '350px', height: '350px', borderRadius: '50%', opacity: 0.3, background: '#667eea', filter: 'blur(60px)', animation: 'float2 10s ease-in-out infinite', pointerEvents: 'none' }} />

      {/* Header */}
      <header style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.2)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '36rem', margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 8h6M7 12h10M7 16h4"/></svg>
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white' }}>📷 AI 上傳名片</h1>
          </div>
          <ThemeToggle style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }} />
        </div>
      </header>

      <main style={{ maxWidth: '36rem', margin: '0 auto', padding: '1.5rem' }}>
        {/* Header text */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'white', marginBottom: '0.5rem' }}>上傳名片</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9375rem' }}>拍攝或選擇名片圖片，AI 自動解析聯絡人資訊</p>
        </div>

        {/* Upload Card */}
        <div style={{ background: 'white', borderRadius: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '2rem', position: 'relative', zIndex: 1, animation: 'slideUp 0.4s ease-out' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Submit Button */}
            <button
              type="submit"
              disabled={!frontFile || loading}
              style={{
                width: '100%',
                padding: '1rem',
                background: !frontFile || loading ? '#9CA3AF' : 'linear-gradient(-45deg, #667eea, #764ba2)',
                color: 'white',
                fontWeight: '700',
                fontSize: '1rem',
                borderRadius: '1rem',
                border: 'none',
                cursor: !frontFile || loading ? 'not-allowed' : 'pointer',
                boxShadow: !frontFile || loading ? 'none' : '0 4px 15px rgba(102,126,234,0.35)',
                transition: 'all 0.3s',
              }}
              onMouseOver={(e) => { if (frontFile && !loading) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; } }}
              onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
            >
              {loading ? '⏳ AI 辨識中...' : '📷 上傳並 AI 解析'}
            </button>

            {/* Front Image */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                名片正面 <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div
                onClick={() => frontInputRef.current?.click()}
                style={{
                  border: `2px dashed ${frontFile ? '#667eea' : '#d1d5db'}`,
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: frontFile ? 'rgba(102, 126, 234, 0.05)' : 'transparent',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#667eea'; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = frontFile ? '#667eea' : '#d1d5db'; }}
              >
                <input ref={frontInputRef} type="file" accept="image/*" className="hidden" onChange={handleFrontChange} />
                {frontPreview ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={frontPreview} alt="正面預覽" style={{ maxHeight: '12rem', borderRadius: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFrontFile(null); setFrontPreview(null); if (frontInputRef.current) frontInputRef.current.value = ""; }}
                      style={{ position: 'absolute', top: '-0.5rem', right: '-0.5rem', width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1.125rem', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div style={{ color: '#9CA3AF' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📇</div>
                    <p style={{ color: '#374151', fontSize: '0.9375rem', fontWeight: '600' }}>點擊選擇名片正面圖片</p>
                    <p style={{ color: '#9CA3AF', fontSize: '0.8125rem', marginTop: '0.25rem' }}>支援 JPG, PNG, HEIC</p>
                  </div>
                )}
              </div>
            </div>

            {/* Back Image (Optional) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                名片背面（選填）
              </label>
              <div
                onClick={() => backInputRef.current?.click()}
                style={{
                  border: `2px dashed ${backFile ? '#667eea' : '#d1d5db'}`,
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: backFile ? 'rgba(102, 126, 234, 0.05)' : 'transparent',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#667eea'; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = backFile ? '#667eea' : '#d1d5db'; }}
              >
                <input ref={backInputRef} type="file" accept="image/*" className="hidden" onChange={handleBackChange} />
                {backPreview ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={backPreview} alt="背面預覽" style={{ maxHeight: '12rem', borderRadius: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); clearBack(); }}
                      style={{ position: 'absolute', top: '-0.5rem', right: '-0.5rem', width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1.125rem', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div style={{ color: '#9CA3AF' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🗒️</div>
                    <p style={{ color: '#374151', fontSize: '0.9375rem', fontWeight: '600' }}>點擊選擇名片背面圖片（選填）</p>
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding: '0.875rem', background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '0.75rem', color: '#EF4444', fontSize: '0.875rem', fontWeight: '500' }}>
                {error}
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
