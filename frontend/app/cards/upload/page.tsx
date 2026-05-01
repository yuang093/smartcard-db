"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import type { CardUploadResponse } from "@/types";
import Navbar from "@/components/Navbar";

/** Compress image to target size (in bytes) using Canvas API */
async function compressImage(file: File, maxSizeBytes: number = 500 * 1024): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      // Calculate target dimensions (max 1200px on longest side)
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
      
      // Try JPEG at quality 0.85 first
      let quality = 0.85;
      let blob: Blob | null = null;
      
      const tryCompress = (mimeType: string, q: number): Promise<Blob | null> => {
        return new Promise((res) => {
          canvas.toBlob(
            (b) => res(b),
            mimeType,
            q
          );
        });
      };
      
      const attempt = async () => {
        for (let q = 0.85; q >= 0.4; q -= 0.1) {
          const b = await tryCompress('image/jpeg', q);
          if (b && b.size <= maxSizeBytes) {
            resolve(new File([b], file.name, { type: 'image/jpeg' }));
            return;
          }
        }
        // If still too big, just return at lowest quality
        const b = await tryCompress('image/jpeg', 0.4);
        if (b) resolve(new File([b], file.name, { type: 'image/jpeg' }));
        else resolve(file); // fallback to original
      };
      
      attempt();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
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

    // ── Debug: 確認檔案真的存在 ────────────────────────────
    if (!frontFile) {
      toast.error("找不到正面檔案狀態，請重新選擇");
      return;
    }
    console.log("即將發送的正面檔案大小:", frontFile.size, "bytes",
      "檔名:", frontFile.name, "類型:", frontFile.type);

    setLoading(true);
    toast.loading("上傳中，請稍候...", { id: "upload-toast", duration: 999999 });

    try {
      // ── 先壓縮圖片（目標 < 500KB）────────────────────────
      let frontToSend = frontFile;
      let backToSend = backFile;
      try {
        frontToSend = await compressImage(frontFile, 500 * 1024);
        console.log("Compressed front:", frontFile.size, "->", frontToSend.size, "bytes");
        if (backFile) {
          backToSend = await compressImage(backFile, 500 * 1024);
          console.log("Compressed back:", backFile.size, "->", backToSend.size, "bytes");
        }
      } catch (cmpErr) {
        console.warn("Compression failed, using original:", cmpErr);
      }
      
      // ── 直接使用原始檔案，移除所有壓縮 ─────────────────────
      const formData = new FormData();
      formData.append("front", frontToSend);
      if (backToSend) {
        formData.append("back", backToSend);
      }

      // ── Debug: 確認 FormData 內容 ────────────────────────
      const frontInFd = formData.get("front");
      console.log("FormData front field:", frontInFd !== null ? "OK" : "NULL/MISSING",
        frontInFd instanceof File ? `File(${(frontInFd as File).size}b)` : String(frontInFd));

      // 從 localStorage 取 JWT token
      const token = localStorage.getItem("smartcard_auth") ? JSON.parse(localStorage.getItem("smartcard_auth")!).token : null;
      console.log("Token present:", !!token, token ? `(${token.substring(0,20)}...)` : "");

      // ── 使用 fetch() 直接發送，杜絕任何 axios 干擾 ─────────────────
      // 瀏覽器會自動生成 multipart/form-data; boundary=...
      // 不需要手動設定 Content-Type
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      console.log("即將發送 fetch 到 /api/v1/cards/upload_and_parse");
      const res = await fetch("/api/v1/cards/upload_and_parse", {
        method: "POST",
        headers,
        body: formData,
      });

      console.log("收到回應 status:", res.status, "statusText:", res.statusText);

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.detail) {
            if (Array.isArray(errData.detail)) {
              errMsg = errData.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(", ");
            } else {
              errData.detail;
            }
          }
        } catch {}
        throw new Error(errMsg);
      }

      const data: CardUploadResponse = await res.json();
      const parsed: ParsedCard = data.parsed || {};

      // Guard: if AI returned empty data or _parse_error, show error and stay
      if (!parsed.name && !parsed.company && !parsed.email && !parsed._parse_error) {
        toast.error("AI 辨識失敗，請重試或手動輸入", { id: "upload-toast" });
        setLoading(false);
        return;
      }

      if (parsed._parse_error) {
        toast.error("AI 辨識失敗：" + parsed._parse_error, { id: "upload-toast" });
        setLoading(false);
        return;
      }

      // Store parsed result AND local preview URLs in sessionStorage
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

      toast.success("AI 辨識完成！", { id: "upload-toast" });
      router.push("/cards/review");
    } catch (err: unknown) {
      toast.dismiss("upload-toast");
      const errMsg = err instanceof Error ? err.message : "上傳失敗";
      setError(errMsg);
      toast.error(errMsg, { id: "upload-toast" });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <Navbar />

      <div className="max-w-xl mx-auto pt-10 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600 mb-2">上傳名片</h1>
          <p className="text-gray-600">拍攝或選擇名片圖片，AI 自動解析聯絡人資訊</p>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* 放在最上面的上傳按鈕 */}
          <button
            type="button"
            onClick={() => frontInputRef.current?.click()}
            disabled={loading}
            className="w-full py-3 px-6 rounded-xl font-semibold text-white transition-all mb-6 bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg active:scale-95"
          >
            📷 選擇名片圖片（可同時選正面+背面）
          </button>

          <form onSubmit={handleSubmit} method="post">
            {/* Front Image */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                名片正面 <span className="text-red-500">*</span>
              </label>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  frontFile ? "border-indigo-400 bg-indigo-50" : "border-gray-300 hover:border-indigo-400"
                }`}
                onClick={() => frontInputRef.current?.click()}
              >
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFrontChange}
                />
                {frontPreview ? (
                  <div className="relative">
                    <img
                      src={frontPreview}
                      alt="名片正面預覽"
                      className="max-h-48 mx-auto rounded-lg shadow-md"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFrontFile(null);
                        setFrontPreview(null);
                        if (frontInputRef.current) frontInputRef.current.value = "";
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-400">
                    <div className="text-5xl mb-3">📇</div>
                    <p className="text-sm">點擊選擇名片正面圖片</p>
                    <p className="text-xs text-gray-400 mt-1">支援 JPG, PNG, HEIC</p>
                  </div>
                )}
              </div>
            </div>

            {/* Back Image (Optional) */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                名片背面（選填）
              </label>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  backFile ? "border-indigo-400 bg-indigo-50" : "border-gray-300 hover:border-indigo-400"
                }`}
                onClick={() => backInputRef.current?.click()}
              >
                <input
                  ref={backInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBackChange}
                />
                {backPreview ? (
                  <div className="relative">
                    <img
                      src={backPreview}
                      alt="名片背面預覽"
                      className="max-h-48 mx-auto rounded-lg shadow-md"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearBack();
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-400">
                    <div className="text-5xl mb-3">🗒️</div>
                    <p className="text-sm">點擊選擇名片背面圖片（選填）</p>
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!frontFile || loading}
              className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-all ${
                !frontFile || loading
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg active:scale-95"
              }`}
            >
              {loading ? "AI 辨識中..." : "開始 AI 解析"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}