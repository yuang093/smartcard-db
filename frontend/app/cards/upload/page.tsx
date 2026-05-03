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

interface ImageInfo {
  file: File | null;
  preview: string | null;
  naturalW: number;
  naturalH: number;
}

function getAutoCrop(): CropArea {
  return { x: 5, y: 5, width: 90, height: 90 };
}

async function getImageDimensions(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = src;
  });
}

async function cropAndResizeImage(blob: File | Blob, crop: CropArea, naturalW: number, naturalH: number, targetWidth: number = 800): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const x = crop.x / 100 * img.naturalWidth;
      const y = crop.y / 100 * img.naturalHeight;
      const w = crop.width / 100 * img.naturalWidth;
      const h = crop.height / 100 * img.naturalHeight;
      const scale = targetWidth / w;
      const targetH = Math.round(h * scale);
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, x, y, w, h, 0, 0, targetWidth, targetH);
      canvas.toBlob((b) => { if (b) resolve(b); else reject(new Error('toBlob failed')); }, 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')); };
    img.src = url;
  });
}

async function compressImage(file: File, maxSizeBytes: number = 500 * 1024): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_DIM = 1200;
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > MAX_DIM || h > MAX_DIM) {
        if (w > h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
        else { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      const tryC = (q: number): Promise<Blob | null> => new Promise((res) => canvas.toBlob((b) => res(b), 'image/jpeg', q));
      (async () => {
        for (let q = 0.85; q >= 0.4; q -= 0.1) {
          const b = await tryC(q);
          if (b && b.size <= maxSizeBytes) { resolve(new File([b], file.name, { type: 'image/jpeg' })); return; }
        }
        const b = await tryC(0.4);
        if (b) resolve(new File([b], file.name, { type: 'image/jpeg' }));
        else resolve(file);
      })();
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')); };
    img.src = url;
  });
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

interface CropBoxProps {
  crop: CropArea;
  onCropChange: (c: CropArea) => void;
  containerW: number;
  containerH: number;
}

function CropBox({ crop, onCropChange, containerW, containerH }: CropBoxProps) {
  const [dragging, setDragging] = useState<'move' | 'tl' | 'tr' | 'bl' | 'br' | null>(null);

  function getClient(e: MouseEvent | Touch) {
    return { x: e.clientX, y: e.clientY };
  }

  function handleDragStart(e: MouseEvent | TouchEvent, type: 'move' | 'tl' | 'tr' | 'bl' | 'br') {
    e.preventDefault();
    e.stopPropagation();
    const start = getClient(e.touches ? e.touches[0] : (e as unknown as MouseEvent));
    setDragging(type);

    const handleMove = (ev: MouseEvent | TouchEvent) => {
      const { x: curX, y: curY } = getClient(ev.touches ? ev.touches[0] : (ev as unknown as MouseEvent));
      const dx = (curX - start.x) / containerW * 100;
      const dy = (curY - start.y) / containerH * 100;
      let nc: CropArea = { ...crop };

      if (type === 'move') {
        nc.x = clamp(crop.x + dx, 0, 100 - crop.width);
        nc.y = clamp(crop.y + dy, 0, 100 - crop.height);
      } else if (type === 'tl') {
        const newW = crop.width - dx;
        const newH = crop.height - dy;
        if (newW > 5 && newH > 5) {
          nc = { x: clamp(crop.x + dx, 0, 100 - newW), y: clamp(crop.y + dy, 0, 100 - newH), width: newW, height: newH };
        }
      } else if (type === 'tr') {
        const newW = crop.width + dx;
        const newH = crop.height - dy;
        if (newW > 5 && newH > 5) {
          nc = { ...crop, y: clamp(crop.y + dy, 0, 100 - newH), width: newW, height: newH };
        }
      } else if (type === 'bl') {
        const newW = crop.width - dx;
        const newH = crop.height + dy;
        if (newW > 5 && newH > 5) {
          nc = { x: clamp(crop.x + dx, 0, 100 - newW), width: newW, height: newH };
        }
      } else if (type === 'br') {
        const newW = crop.width + dx;
        const newH = crop.height + dy;
        if (newW > 5 && newH > 5) {
          nc = { ...crop, width: newW, height: newH };
        }
      }

      nc.x = clamp(nc.x, 0, 100 - nc.width);
      nc.y = clamp(nc.y, 0, 100 - nc.height);
      nc.width = clamp(nc.width, 5, 100);
      nc.height = clamp(nc.height, 5, 100);
      onCropChange(nc);
    };

    const handleEnd = () => {
      setDragging(null);
      document.removeEventListener('mousemove', handleMove as EventListener);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove as EventListener);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove as EventListener);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove as EventListener, { passive: false });
    document.addEventListener('touchend', handleEnd);
  }

  const boxStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${crop.x / 100 * containerW}px`,
    top: `${crop.y / 100 * containerH}px`,
    width: `${crop.width / 100 * containerW}px`,
    height: `${crop.height / 100 * containerH}px`,
    border: '2px solid #667EEA',
    boxSizing: 'border-box',
    cursor: dragging === 'move' ? 'move' : 'nw-resize',
    background: 'rgba(102,126,234,0.08)',
    touchAction: 'none',
    userSelect: 'none',
  };

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* Dark overlay with cutout */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${crop.y}%`, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'absolute', top: `${crop.y + crop.height}%`, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'absolute', top: `${crop.y}%`, left: 0, width: `${crop.x}%`, height: `${crop.height}%`, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'absolute', top: `${crop.y}%`, left: `${crop.x + crop.width}%`, right: 0, height: `${crop.height}%`, background: 'rgba(0,0,0,0.5)' }} />

      {/* Crop box with move handle */}
      <div
        style={boxStyle}
        onMouseDown={(e) => handleDragStart(e, 'move')}
        onTouchStart={(e) => handleDragStart(e, 'move')}
        onDragStart={(e) => e.preventDefault()}
      >
        {/* Corner handles */}
        {[
          { pos: 'tl', left: -4, top: -4, cursor: 'nw-resize' },
          { pos: 'tr', right: -4, top: -4, cursor: 'ne-resize' },
          { pos: 'bl', left: -4, bottom: -4, cursor: 'sw-resize' },
          { pos: 'br', right: -4, bottom: -4, cursor: 'se-resize' },
        ].map(({ pos, left, right, top, bottom, cursor }) => (
          <div
            key={pos}
            style={{
              position: 'absolute',
              left: left !== undefined ? left : undefined,
              right: right !== undefined ? right : undefined,
              top: top !== undefined ? top : undefined,
              bottom: bottom !== undefined ? bottom : undefined,
              width: '14px', height: '14px',
              background: '#667EEA',
              border: '2px solid white',
              borderRadius: '3px',
              pointerEvents: 'all',
              cursor,
              touchAction: 'none',
            }}
            onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, pos as 'tl' | 'tr' | 'bl' | 'br'); }}
            onTouchStart={(e) => { e.stopPropagation(); handleDragStart(e, pos as 'tl' | 'tr' | 'bl' | 'br'); }}
            onDragStart={(e) => e.preventDefault()}
          />
        ))}
      </div>
    </div>
  );
}

interface ParsedCard {
  name?: string | null; company?: string | null; title?: string | null;
  phone?: string | null; mobile?: string | null; email?: string | null;
  address?: string | null; suggested_tags?: string[];
  front_image_url?: string | null; back_image_url?: string | null;
  _parse_error?: string; _front_preview?: string | null; _back_preview?: string | null;
}

export default function UploadPage() {
  const router = useRouter();
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const [frontImg, setFrontImg] = useState<ImageInfo>({ file: null, preview: null, naturalW: 0, naturalH: 0 });
  const [backImg, setBackImg] = useState<ImageInfo>({ file: null, preview: null, naturalW: 0, naturalH: 0 });
  const [frontCrop, setFrontCrop] = useState<CropArea>(getAutoCrop);
  const [backCrop, setBackCrop] = useState<CropArea>(getAutoCrop);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [frontSize, setFrontSize] = useState({ w: 0, h: 0 });
  const [backSize, setBackSize] = useState({ w: 0, h: 0 });

  useEffect(() => { setMounted(true); }, []);

  async function handleFrontChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    const dims = await getImageDimensions(preview);
    if (dims.w === 0) { toast.error("圖片載入失敗"); return; }
    setFrontImg({ file, preview, naturalW: dims.w, naturalH: dims.h });
    setFrontCrop(getAutoCrop());
    setError("");
  }

  async function handleBackChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    const dims = await getImageDimensions(preview);
    if (dims.w === 0) { toast.error("圖片載入失敗"); return; }
    setBackImg({ file, preview, naturalW: dims.w, naturalH: dims.h });
    setBackCrop(getAutoCrop());
  }

  function clearBack() {
    setBackImg({ file: null, preview: null, naturalW: 0, naturalH: 0 });
    setBackCrop(getAutoCrop());
    if (backInputRef.current) backInputRef.current.value = "";
  }

  async function handleCropAndUpload() {
    if (!frontImg.file) return;

    setLoading(true);
    toast.loading("📐 裁切中...", { id: "upload-toast", duration: 999999 });

    try {
      let frontBlob: Blob;
      if (frontCrop.width > 5 && frontCrop.height > 5) {
        frontBlob = await cropAndResizeImage(frontImg.file, frontCrop, frontImg.naturalW, frontImg.naturalH, 800);
      } else {
        frontBlob = await compressImage(frontImg.file, 500 * 1024);
      }

      let backBlob: Blob | null = null;
      if (backImg.file && backCrop.width > 5 && backCrop.height > 5) {
        backBlob = await cropAndResizeImage(backImg.file, backCrop, backImg.naturalW, backImg.naturalH, 800);
      } else if (backImg.file) {
        backBlob = await compressImage(backImg.file, 500 * 1024);
      }

      toast.dismiss("upload-toast");
      toast.loading("📤 上傳中...", { id: "upload-toast", duration: 999999 });

      const formData = new FormData();
      formData.append("front", new File([frontBlob], "front.jpg", { type: 'image/jpeg' }));
      if (backBlob) formData.append("back", new File([backBlob], "back.jpg", { type: 'image/jpeg' }));

      const token = localStorage.getItem("smartcard_auth") ? JSON.parse(localStorage.getItem("smartcard_auth")!).token : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/v1/cards/upload_and_parse", { method: "POST", headers, body: formData });
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try { const d = await res.json(); if (d.detail) errMsg = String(d.detail); } catch {}
        throw new Error(errMsg);
      }

      const data: CardUploadResponse = await res.json();
      const parsed: ParsedCard = data.parsed || {};
      if (!parsed.name && !parsed.company && !parsed.email && !parsed._parse_error) throw new Error("AI 辨識失敗");
      if (parsed._parse_error) throw new Error("AI 辨識失敗：" + parsed._parse_error);

      const croppedFrontUrl = URL.createObjectURL(frontBlob);
      const croppedBackUrl = backBlob ? URL.createObjectURL(backBlob) : null;

      sessionStorage.setItem("parsed_card", JSON.stringify({
        ...parsed,
        front_image_url: data.front_image_url,
        back_image_url: data.back_image_url,
        _front_preview: croppedFrontUrl,
        _back_preview: croppedBackUrl,
      }));

      toast.success("✨ AI 辨識完成！", { id: "upload-toast" });
      router.push("/cards/review");
    } catch (err: unknown) {
      toast.dismiss("upload-toast");
      const errMsg = err instanceof Error ? err.message : "上傳失敗";
      setError(errMsg); toast.error(errMsg);
      setLoading(false);
    }
  }

  const btnBase: React.CSSProperties = { flex: 1, padding: '0.5rem', fontSize: '0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600', border: 'none' };

  const hasFront = frontImg.preview !== null;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #f5576c)', backgroundSize: '400% 400%', animation: 'gradientShift 10s ease infinite' }}>
      <Toaster position="top center" toastOptions={{ duration: 3000 }} />
      <div style={{ position: 'fixed', top: '-10%', right: '-5%', width: '400px', height: '400px', borderRadius: '50%', opacity: 0.3, background: '#f093fb', filter: 'blur(60px)', animation: 'float1 8s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10%', left: '-5%', width: '350px', height: '350px', borderRadius: '50%', opacity: 0.3, background: '#667eea', filter: 'blur(60px)', animation: 'float2 10s ease-in-out infinite', pointerEvents: 'none' }} />

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
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'white', marginBottom: '0.5rem' }}>上傳名片</h2>
          {mounted && (
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9375rem' }} suppressHydrationWarning>
              {hasFront ? '拖曳角落調整裁切範圍' : '拍攝或選擇名片圖片'}
            </p>
          )}
        </div>

        <div style={{ background: 'white', borderRadius: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '2rem', position: 'relative', zIndex: 1, animation: 'slideUp 0.4s ease-out' }}>
          <button type="button" onClick={handleCropAndUpload} disabled={!frontImg.file || loading}
            style={{ width: '100%', marginBottom: '1.25rem', padding: '1rem', background: !frontImg.file || loading ? '#9CA3AF' : 'linear-gradient(-45deg, #667eea, #764ba2)', color: 'white', fontWeight: '700', fontSize: '1rem', borderRadius: '1rem', border: 'none', cursor: !frontImg.file || loading ? 'not-allowed' : 'pointer', boxShadow: !frontImg.file || loading ? 'none' : '0 4px 15px rgba(102,126,234,0.35)', transition: 'all 0.3s' }}>
            {loading ? '⏳ 處理中...' : '📐 裁切並上傳'}
          </button>

          {error && <div style={{ padding: '0.75rem', background: '#FEE2E2', borderRadius: '0.75rem', color: '#991B1B', fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

          {/* Front */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>名片正面 <span style={{ color: '#EF4444' }}>*</span></label>
            {frontImg.preview ? (
              <div>
                <div style={{ position: 'relative', borderRadius: '0.75rem', overflow: 'hidden', border: '2px solid #667EEA' }}>
                  <img
                    src={frontImg.preview}
                    alt="正面預覽"
                    style={{ display: 'block', width: '100%', height: 'auto', userSelect: 'none', pointerEvents: 'none' }}
                    onLoad={(e) => {
                      const img = e.target as HTMLImageElement;
                      setFrontSize({ w: img.clientWidth, h: img.clientHeight });
                    }}
                  />
                  {frontSize.w > 0 && (
                    <CropBox
                      crop={frontCrop}
                      onCropChange={setFrontCrop}
                      containerW={frontSize.w}
                      containerH={frontSize.h}
                    />
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setFrontCrop(getAutoCrop())} style={{ ...btnBase, border: '1px solid #667EEA', background: '#EEF2FF', color: '#667EEA' }}>🔄 自動偵測</button>
                  <button type="button" onClick={() => setFrontCrop({ x: 0, y: 0, width: 100, height: 100 })} style={{ ...btnBase, border: '1px solid #9CA3AF', background: 'white', color: '#6B7280' }}>顯示全部</button>
                  <button type="button" onClick={() => frontInputRef.current?.click()} style={{ ...btnBase, border: '1px solid #E5E7EB', background: '#F3F4F6', color: '#6B7280' }}>🔄 重新選擇</button>
                </div>
              </div>
            ) : (
              <div onClick={() => frontInputRef.current?.click()} style={{ padding: '2rem', textAlign: 'center', background: '#F8FAFC', border: '2px dashed #CBD5E1', borderRadius: '0.75rem', cursor: 'pointer' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.5" style={{ margin: '0 auto 0.5rem' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748B' }}>點擊上傳名片正面</p>
                <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.25rem' }}>支援 JPG、PNG、WebP</p>
              </div>
            )}
            <input ref={frontInputRef} type="file" accept="image/*" onChange={handleFrontChange} style={{ display: 'none' }} />
          </div>

          {/* Back */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>名片背面 <span style={{ color: '#9CA3AF', fontWeight: '400' }}>（選填）</span></label>
            {backImg.preview ? (
              <div>
                <div style={{ position: 'relative', borderRadius: '0.75rem', overflow: 'hidden', border: '2px solid #667EEA' }}>
                  <img
                    src={backImg.preview}
                    alt="背面預覽"
                    style={{ display: 'block', width: '100%', height: 'auto', userSelect: 'none', pointerEvents: 'none' }}
                    onLoad={(e) => {
                      const img = e.target as HTMLImageElement;
                      setBackSize({ w: img.clientWidth, h: img.clientHeight });
                    }}
                  />
                  {backSize.w > 0 && (
                    <CropBox
                      crop={backCrop}
                      onCropChange={setBackCrop}
                      containerW={backSize.w}
                      containerH={backSize.h}
                    />
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setBackCrop(getAutoCrop())} style={{ ...btnBase, border: '1px solid #667EEA', background: '#EEF2FF', color: '#667EEA' }}>🔄 自動偵測</button>
                  <button type="button" onClick={() => setBackCrop({ x: 0, y: 0, width: 100, height: 100 })} style={{ ...btnBase, border: '1px solid #9CA3AF', background: 'white', color: '#6B7280' }}>顯示全部</button>
                  <button type="button" onClick={clearBack} style={{ ...btnBase, border: '1px solid #E5E7EB', background: '#F3F4F6', color: '#6B7280' }}>🗑 移除</button>
                </div>
              </div>
            ) : (
              <div onClick={() => backInputRef.current?.click()} style={{ padding: '1.5rem', textAlign: 'center', background: '#F8FAFC', border: '2px dashed #CBD5E1', borderRadius: '0.75rem', cursor: 'pointer' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.5" style={{ margin: '0 auto 0.5rem' }}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>
                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748B' }}>點擊上傳名片背面</p>
              </div>
            )}
            <input ref={backInputRef} type="file" accept="image/*" onChange={handleBackChange} style={{ display: 'none' }} />
          </div>
        </div>

        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '1rem', backdropFilter: 'blur(8px)' }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.6 }} suppressHydrationWarning>
            💡 {hasFront ? '拖曳藍色方框移動位置，拖曳角落調整大小' : '上傳照片後拖曳調整裁切範圍'}
          </p>
        </div>
      </main>

      <style>{`
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float1 { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(5deg); } }
        @keyframes float2 { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(20px) rotate(-5deg); } }
      `}</style>
    </div>
  );
}