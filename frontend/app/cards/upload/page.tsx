'use client';

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import type { CardUploadResponse } from "@/types";
import ThemeToggle from "@/components/ThemeToggle";

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImagePreview {
  file: File | null;
  preview: string | null;
  cropped: Blob | null;
}

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

async function cropAndResizeImage(
  fileOrBlob: File | Blob,
  crop: CropArea,
  targetWidth: number = 800
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(fileOrBlob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = targetWidth / crop.width;
      const targetHeight = Math.round(crop.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, targetWidth, targetHeight);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

function autoDetectCrop(width: number, height: number): CropArea {
  const padding = Math.round(Math.min(width, height) * 0.05);
  return {
    x: padding,
    y: padding,
    width: width - padding * 2,
    height: height - padding * 2,
  };
}

interface CropCanvasProps {
  src: string;
  crop: CropArea;
  onCropChange: (c: CropArea) => void;
  label: string;
}

function CropCanvas({ src, crop, onCropChange, label }: CropCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      const displayWidth = container.clientWidth;
      const scale = displayWidth / img.width;
      const displayHeight = img.height * scale;
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      const cx = crop.x * scale;
      const cy = crop.y * scale;
      const cw = crop.width * scale;
      const ch = crop.height * scale;
      ctx.strokeStyle = '#667EEA';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(cx, cy, cw, ch);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(102,126,234,0.15)';
      ctx.fillRect(cx, cy, cw, ch);
    };
    img.src = src;
  }, [src, crop]);

  function getCropFromEvent(e: React.MouseEvent<HTMLCanvasElement>) {
    const container = containerRef.current;
    if (!container) return crop;
    const rect = container.getBoundingClientRect();
    const scaleX = 1;
    const scaleY = 1;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { x, y, width: crop.width, height: crop.height };
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontSize: '0.8rem', fontWeight: '600', color: '#667EEA', marginBottom: '0.5rem' }}>
        {label} — 拖曳選取裁切範圍
      </p>
      <div ref={containerRef} style={{ position: 'relative', borderRadius: '0.75rem', overflow: 'hidden', border: '2px solid #667EEA', cursor: 'crosshair' }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%' }}
          onMouseDown={(e) => {
            const ev = e as unknown as React.MouseEvent<HTMLCanvasElement>;
            setDragging(true);
            setDragStart({ x: ev.clientX, y: ev.clientY });
          }}
          onMouseMove={(e) => {
            if (!dragging) return;
            const ev = e as unknown as React.MouseEvent<HTMLCanvasElement>;
            const container = containerRef.current;
            if (!container) return;
            const img = new window.Image();
            img.src = src;
            const rect = container.getBoundingClientRect();
            const scaleX = img.width / rect.width;
            const scaleY = img.height / rect.height;
            const rawX = (ev.clientX - rect.left);
            const rawY = (ev.clientY - rect.top);
            const rawW = Math.abs(ev.clientX - (dragStart.x));
            const rawH = Math.abs(ev.clientY - (dragStart.y));
            onCropChange({
              x: Math.max(0, Math.min(crop.x, rawX * scaleX)),
              y: Math.max(0, Math.min(crop.y, rawY * scaleY)),
              width: Math.min(img.width - crop.x, rawW * scaleX),
              height: Math.min(img.height - crop.y, rawH * scaleY),
            });
          }}
          onMouseUp={() => setDragging(false)}
          onMouseLeave={() => setDragging(false)}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button
          type="button"
          onClick={() => {
            const img = new window.Image();
            img.src = src;
            onCropChange(autoDetectCrop(img.width, img.height));
          }}
          style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', borderRadius: '0.5rem', border: '1px solid #667EEA', background: '#EEF2FF', color: '#667EEA', cursor: 'pointer', fontWeight: '600' }}
        >
          🔄 自動偵測
        </button>
        <button
          type="button"
          onClick={() => {
            const img = new window.Image();
            img.src = src;
            onCropChange({ x: 0, y: 0, width: img.width, height: img.height });
          }}
          style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', borderRadius: '0.5rem', border: '1px solid #9CA3AF', background: 'white', color: '#6B7280', cursor: 'pointer', fontWeight: '600' }}
        >
          顯示全部
        </button>
      </div>
    </div>
  );
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

  const [frontImg, setFrontImg] = useState<ImagePreview>({ file: null, preview: null, cropped: null });
  const [backImg, setBackImg] = useState<ImagePreview>({ file: null, preview: null, cropped: null });
  const [frontCrop, setFrontCrop] = useState<CropArea | null>(null);
  const [backCrop, setBackCrop] = useState<CropArea | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleFrontChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setFrontCrop(autoDetectCrop(img.width, img.height));
    };
    img.src = preview;
    setFrontImg({ file, preview, cropped: null });
    setError("");
  }

  function handleBackChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setBackCrop(autoDetectCrop(img.width, img.height));
    };
    img.src = preview;
    setBackImg({ file, preview, cropped: null });
  }

  function clearBack() {
    setBackImg({ file: null, preview: null, cropped: null });
    setBackCrop(null);
    if (backInputRef.current) backInputRef.current.value = "";
  }

  async function handleCropAndUpload() {
    if (!frontImg.file || !frontImg.preview) return;

    setLoading(true);
    toast.loading("📐 裁切影像中...", { id: "upload-toast", duration: 999999 });

    try {
      let frontBlob: Blob;
      if (frontCrop) {
        frontBlob = await cropAndResizeImage(frontImg.file, frontCrop, 800);
      } else {
        const comp = await compressImage(frontImg.file, 500 * 1024);
        frontBlob = comp;
      }

      let backBlob: Blob | null = null;
      if (backImg.file && backImg.preview && backCrop) {
        backBlob = await cropAndResizeImage(backImg.file, backCrop, 800);
      } else if (backImg.file) {
        const comp = await compressImage(backImg.file, 500 * 1024);
        backBlob = comp;
      }

      toast.dismiss("upload-toast");
      toast.loading("📤 上傳中，請稍候...", { id: "upload-toast", duration: 999999 });

      const formData = new FormData();
      formData.append("front", new File([frontBlob], "front.jpg", { type: 'image/jpeg' }));
      if (backBlob) {
        formData.append("back", new File([backBlob], "back.jpg", { type: 'image/jpeg' }));
      }

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

      sessionStorage.setItem(
        "parsed_card",
        JSON.stringify({
          ...parsed,
          front_image_url: data.front_image_url,
          back_image_url: data.back_image_url,
          _front_preview: frontImg.preview,
          _back_preview: backImg.preview,
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
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9375rem' }}>拍攝或選擇名片圖片，AI 自動裁切並解析</p>
        </div>

        {/* Upload Card */}
        <div style={{ background: 'white', borderRadius: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '2rem', position: 'relative', zIndex: 1, animation: 'slideUp 0.4s ease-out' }}>
          {/* Submit Button */}
          <button
            type="button"
            onClick={handleCropAndUpload}
            disabled={!frontImg.file || loading}
            style={{
              width: '100%',
              marginBottom: '1.25rem',
              padding: '1rem',
              background: !frontImg.file || loading ? '#9CA3AF' : 'linear-gradient(-45deg, #667eea, #764ba2)',
              color: 'white',
              fontWeight: '700',
              fontSize: '1rem',
              borderRadius: '1rem',
              border: 'none',
              cursor: !frontImg.file || loading ? 'not-allowed' : 'pointer',
              boxShadow: !frontImg.file || loading ? 'none' : '0 4px 15px rgba(102,126,234,0.35)',
              transition: 'all 0.3s',
            }}
            onMouseOver={(e) => { if (frontImg.file && !loading) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; } }}
            onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
          >
            {loading ? '⏳ 處理中...' : '📐 裁切並上傳'}
          </button>

          {error && (
            <div style={{ padding: '0.75rem', background: '#FEE2E2', borderRadius: '0.75rem', color: '#991B1B', fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {/* Front Image */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
              名片正面 <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div
              onClick={() => frontInputRef.current?.click()}
              style={{
                border: '2px dashed #CBD5E1',
                borderRadius: '1rem',
                padding: '2rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: '#F8FAFC',
              }}
              onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#667EEA'; (e.currentTarget as HTMLDivElement).style.background = '#EEF2FF'; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#CBD5E1'; (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'; }}
            >
              {frontImg.preview ? (
                <CropCanvas
                  src={frontImg.preview}
                  crop={frontCrop || { x: 0, y: 0, width: 1, height: 1 }}
                  onCropChange={setFrontCrop}
                  label="正面"
                />
              ) : (
                <div style={{ color: '#64748B' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 0.5rem' }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <p style={{ fontSize: '0.875rem', fontWeight: '600' }}>點擊上傳名片正面</p>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>支援 JPG、PNG、WebP</p>
                </div>
              )}
            </div>
            <input ref={frontInputRef} type="file" accept="image/*" onChange={handleFrontChange} style={{ display: 'none' }} />
          </div>

          {/* Back Image */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
              名片背面 <span style={{ color: '#9CA3AF', fontWeight: '400' }}>（選填）</span>
            </label>
            <div
              onClick={() => backInputRef.current?.click()}
              style={{
                border: '2px dashed #CBD5E1',
                borderRadius: '1rem',
                padding: '1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: '#F8FAFC',
              }}
              onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#667EEA'; (e.currentTarget as HTMLDivElement).style.background = '#EEF2FF'; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#CBD5E1'; (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'; }}
            >
              {backImg.preview ? (
                <CropCanvas
                  src={backImg.preview}
                  crop={backCrop || { x: 0, y: 0, width: 1, height: 1 }}
                  onCropChange={setBackCrop}
                  label="背面"
                />
              ) : (
                <div style={{ color: '#64748B' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 0.5rem' }}>
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M12 8v8M8 12h8"/>
                  </svg>
                  <p style={{ fontSize: '0.875rem', fontWeight: '600' }}>點擊上傳名片背面</p>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>支援 JPG、PNG、WebP</p>
                </div>
              )}
            </div>
            <input ref={backInputRef} type="file" accept="image/*" onChange={handleBackChange} style={{ display: 'none' }} />
            {backImg.preview && (
              <button
                type="button"
                onClick={clearBack}
                style={{
                  marginTop: '0.5rem',
                  width: '100%',
                  padding: '0.5rem',
                  background: '#FEE2E2',
                  color: '#991B1B',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                🗑 移除背面
              </button>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '1rem', backdropFilter: 'blur(8px)' }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.6 }}>
            💡 提示：上傳後可拖曳選取名片範圍，系統會自動裁切並壓縮至 800px 寬，適合手機快速載入
          </p>
        </div>
      </main>

      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float1 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(20px) rotate(-5deg); }
        }
      `}</style>
    </div>
  );
}