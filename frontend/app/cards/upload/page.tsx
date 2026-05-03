'use client';

import { useState, useRef, useEffect, useCallback } from "react";
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
}

async function cropAndResizeImage(
  blob: File | Blob,
  crop: CropArea,
  targetWidth: number = 800
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = targetWidth / crop.width;
      const targetHeight = Math.round(crop.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, targetWidth, targetHeight);
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

function getAutoCrop(imgWidth: number, imgHeight: number): CropArea {
  const pad = Math.round(Math.min(imgWidth, imgHeight) * 0.05);
  return { x: pad, y: pad, width: imgWidth - pad * 2, height: imgHeight - pad * 2 };
}

async function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = src;
  });
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

  const [frontImg, setFrontImg] = useState<ImagePreview>({ file: null, preview: null });
  const [backImg, setBackImg] = useState<ImagePreview>({ file: null, preview: null });
  const [frontCrop, setFrontCrop] = useState<CropArea | null>(null);
  const [backCrop, setBackCrop] = useState<CropArea | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  const frontCanvasRef = useRef<HTMLCanvasElement>(null);
  const frontContainerRef = useRef<HTMLDivElement>(null);
  const backCanvasRef = useRef<HTMLCanvasElement>(null);
  const backContainerRef = useRef<HTMLDivElement>(null);

  // Draw crop overlay
  const drawCrop = useCallback(async (
    canvas: HTMLCanvasElement,
    container: HTMLDivElement,
    src: string,
    crop: CropArea
  ) => {
    const img = new Image();
    img.onload = () => {
      const displayW = container.clientWidth;
      const scale = displayW / img.width;
      const displayH = img.height * scale;
      canvas.width = displayW;
      canvas.height = displayH;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, displayW, displayH);
      const cx = crop.x * scale;
      const cy = crop.y * scale;
      const cw = crop.width * scale;
      const ch = crop.height * scale;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.clearRect(cx, cy, cw, ch);
      ctx.strokeStyle = '#667EEA';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cw, ch);
    };
    img.src = src;
  }, []);

  // Front canvas update
  useEffect(() => {
    if (!frontImg.preview || !frontCrop || !frontCanvasRef.current || !frontContainerRef.current) return;
    drawCrop(frontCanvasRef.current, frontContainerRef.current, frontImg.preview, frontCrop);
  }, [frontImg.preview, frontCrop, drawCrop]);

  // Back canvas update
  useEffect(() => {
    if (!backImg.preview || !backCrop || !backCanvasRef.current || !backContainerRef.current) return;
    drawCrop(backCanvasRef.current, backContainerRef.current, backImg.preview, backCrop);
  }, [backImg.preview, backCrop, drawCrop]);

  async function handleFrontChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    const dims = await getImageDimensions(preview);
    if (dims.width === 0) {
      toast.error("圖片載入失敗，請重試");
      return;
    }
    setFrontImg({ file, preview });
    setFrontCrop(getAutoCrop(dims.width, dims.height));
    setError("");
  }

  async function handleBackChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    const dims = await getImageDimensions(preview);
    if (dims.width === 0) {
      toast.error("圖片載入失敗，請重試");
      return;
    }
    setBackImg({ file, preview });
    setBackCrop(getAutoCrop(dims.width, dims.height));
  }

  function clearBack() {
    setBackImg({ file: null, preview: null });
    setBackCrop(null);
    if (backInputRef.current) backInputRef.current.value = "";
  }

  async function runAutoDetect(isFront: boolean) {
    const src = isFront ? frontImg.preview : backImg.preview;
    if (!src) return;
    const dims = await getImageDimensions(src);
    if (dims.width === 0) return;
    const crop = getAutoCrop(dims.width, dims.height);
    if (isFront) setFrontCrop(crop);
    else setBackCrop(crop);
  }

  async function runShowAll(isFront: boolean) {
    const src = isFront ? frontImg.preview : backImg.preview;
    if (!src) return;
    const dims = await getImageDimensions(src);
    if (dims.width === 0) return;
    if (isFront) setFrontCrop({ x: 0, y: 0, width: dims.width, height: dims.height });
    else setBackCrop({ x: 0, y: 0, width: dims.width, height: dims.height });
  }

  function handleCanvasMouseDown(e: React.MouseEvent<HTMLCanvasElement>, isFront: boolean) {
    e.stopPropagation();
    const container = isFront ? frontContainerRef.current : backContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scaleX = (frontImg.preview ? ((): number => {
      const img = new Image(); img.src = frontImg.preview!; return img.width / container.clientWidth;
    })() : 1);
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleX;
    setDragging(true);
    setDragStart({ x, y });
  }

  function handleCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>, isFront: boolean) {
    if (!dragging) return;
    e.stopPropagation();
    const container = isFront ? frontContainerRef.current : backContainerRef.current;
    const src = isFront ? frontImg.preview : backImg.preview;
    if (!container || !src) return;
    const img = new Image();
    img.src = src;
    const scale = img.width / container.clientWidth;
    const rect = container.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const rawW = Math.abs(rawX - (dragStart.x / scale));
    const rawH = Math.abs(rawY - (dragStart.y / scale));
    const newCrop = {
      x: Math.max(0, rawX * scale),
      y: Math.max(0, rawY * scale),
      width: Math.min(img.width - rawX * scale, rawW),
      height: Math.min(img.height - rawY * scale, rawH),
    };
    if (isFront) setFrontCrop(newCrop);
    else setBackCrop(newCrop);
  }

  function handleCanvasMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    e.stopPropagation();
    setDragging(false);
  }

  async function handleCropAndUpload() {
    if (!frontImg.file || !frontImg.preview) return;

    setLoading(true);
    toast.loading("📐 裁切影像中...", { id: "upload-toast", duration: 999999 });

    try {
      let frontBlob: Blob;
      if (frontCrop && frontCrop.width > 10 && frontCrop.height > 10) {
        frontBlob = await cropAndResizeImage(frontImg.file, frontCrop, 800);
      } else {
        const comp = await compressImage(frontImg.file, 500 * 1024);
        frontBlob = comp;
      }

      let backBlob: Blob | null = null;
      if (backImg.file && backCrop && backCrop.width > 10 && backCrop.height > 10) {
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

      // Pass the cropped blob URL as preview
      const croppedFrontUrl = URL.createObjectURL(frontBlob);
      const croppedBackUrl = backBlob ? URL.createObjectURL(backBlob) : null;

      sessionStorage.setItem(
        "parsed_card",
        JSON.stringify({
          ...parsed,
          front_image_url: data.front_image_url,
          back_image_url: data.back_image_url,
          _front_preview: croppedFrontUrl,
          _back_preview: croppedBackUrl,
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
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'white', marginBottom: '0.5rem' }}>上傳名片</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9375rem' }}>拍攝或選擇名片圖片，AI 自動裁切並解析</p>
        </div>

        {/* Upload Card */}
        <div style={{ background: 'white', borderRadius: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '2rem', position: 'relative', zIndex: 1, animation: 'slideUp 0.4s ease-out' }}>
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
            onMouseOver={(e) => { if (frontImg.file && !loading) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; }}
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
              onClick={() => { if (!frontImg.preview) frontInputRef.current?.click(); }}
              style={{
                border: '2px dashed #CBD5E1',
                borderRadius: '1rem',
                padding: frontImg.preview ? '0' : '2rem',
                textAlign: 'center',
                cursor: frontImg.preview ? 'default' : 'pointer',
                transition: 'all 0.2s',
                background: '#F8FAFC',
                overflow: 'hidden',
              }}
            >
              {frontImg.preview ? (
                <div>
                  <p style={{ fontSize: '0.8rem', fontWeight: '600', color: '#667EEA', padding: '0.75rem 0.75rem 0.5rem', textAlign: 'center' }}>
                    正面 — 拖曳選取裁切範圍
                  </p>
                  <div ref={frontContainerRef} style={{ position: 'relative', cursor: 'crosshair' }}>
                    <canvas
                      ref={frontCanvasRef}
                      style={{ display: 'block', width: '100%' }}
                      onMouseDown={(e) => handleCanvasMouseDown(e, true)}
                      onMouseMove={(e) => handleCanvasMouseMove(e, true)}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem' }}>
                    <button type="button" onClick={(e) => { e.stopPropagation(); runAutoDetect(true); }} style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', borderRadius: '0.5rem', border: '1px solid #667EEA', background: '#EEF2FF', color: '#667EEA', cursor: 'pointer', fontWeight: '600' }}>🔄 自動偵測</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); runShowAll(true); }} style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', borderRadius: '0.5rem', border: '1px solid #9CA3AF', background: 'white', color: '#6B7280', cursor: 'pointer', fontWeight: '600' }}>顯示全部</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); frontInputRef.current?.click(); }} style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB', background: '#F3F4F6', color: '#6B7280', cursor: 'pointer', fontWeight: '600' }}>🔄 重新選擇</button>
                  </div>
                </div>
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
              onClick={() => { if (!backImg.preview) backInputRef.current?.click(); }}
              style={{
                border: '2px dashed #CBD5E1',
                borderRadius: '1rem',
                padding: backImg.preview ? '0' : '1.5rem',
                textAlign: 'center',
                cursor: backImg.preview ? 'default' : 'pointer',
                transition: 'all 0.2s',
                background: '#F8FAFC',
                overflow: 'hidden',
              }}
            >
              {backImg.preview ? (
                <div>
                  <p style={{ fontSize: '0.8rem', fontWeight: '600', color: '#667EEA', padding: '0.75rem 0.75rem 0.5rem', textAlign: 'center' }}>
                    背面 — 拖曳選取裁切範圍
                  </p>
                  <div ref={backContainerRef} style={{ position: 'relative', cursor: 'crosshair' }}>
                    <canvas
                      ref={backCanvasRef}
                      style={{ display: 'block', width: '100%' }}
                      onMouseDown={(e) => handleCanvasMouseDown(e, false)}
                      onMouseMove={(e) => handleCanvasMouseMove(e, false)}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem' }}>
                    <button type="button" onClick={(e) => { e.stopPropagation(); runAutoDetect(false); }} style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', borderRadius: '0.5rem', border: '1px solid #667EEA', background: '#EEF2FF', color: '#667EEA', cursor: 'pointer', fontWeight: '600' }}>🔄 自動偵測</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); runShowAll(false); }} style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', borderRadius: '0.5rem', border: '1px solid #9CA3AF', background: 'white', color: '#6B7280', cursor: 'pointer', fontWeight: '600' }}>顯示全部</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); backInputRef.current?.click(); }} style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB', background: '#F3F4F6', color: '#6B7280', cursor: 'pointer', fontWeight: '600' }}>🔄 重新選擇</button>
                  </div>
                </div>
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
              <button type="button" onClick={clearBack} style={{ marginTop: '0.5rem', width: '100%', padding: '0.5rem', background: '#FEE2E2', color: '#991B1B', fontSize: '0.8rem', fontWeight: '600', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>
                🗑 移除背面
              </button>
            )}
          </div>
        </div>

        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '1rem', backdropFilter: 'blur(8px)' }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.6 }}>
            💡 提示：上傳後系統會自動偵測名片範圍（藍色框），可拖曳調整。裁切後統一壓縮至 800px 寬，適合手機快速載入
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