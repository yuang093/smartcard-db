"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";

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
  _front_preview?: string | null;  // local object URL for instant preview
  _back_preview?: string | null;     // local object URL for instant preview
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      // Prefer local object URL (instant preview), fallback to server URL
      setImageUrls({
        front: parsed._front_preview || parsed.front_image_url || "",
        back: parsed._back_preview || parsed.back_image_url || "",
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

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
      console.log("Submitting card with form:", form);
      console.log("Image URLs:", imageUrls);
      const result = await api.post("/api/v1/cards", {
        ...form,
        front_image_url: imageUrls.front || null,
        back_image_url: imageUrls.back || null,
        tag_ids: [],
      });
      console.log("Card saved successfully:", result);
      sessionStorage.removeItem("parsed_card");
      toast.success("名片已儲存！");
      router.push("/cards");
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : "儲存失敗，請稍後再試";
      console.error("Save card error:", error, err);
      setError(error);
      toast.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <Toaster position="top center" />
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Image preview using relative URLs (served via Next.js /api proxy) */}
        <div className="flex gap-3 mb-6">
          {imageUrls.front && (
            <div className="w-24 h-16 bg-gray-100 rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/uploads/${imageUrls.front.split("/").pop()}`}
                alt="正面"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {imageUrls.back && (
            <div className="w-24 h-16 bg-gray-100 rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/uploads/${imageUrls.back.split("/").pop()}`}
                alt="背面"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">📋 人工校對</h2>
            {data._parse_error && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                AI 辨識不完整
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Suggested tags */}
            {data.suggested_tags && data.suggested_tags.length > 0 && (
              <div className="p-3 bg-indigo-50 rounded-xl">
                <p className="text-xs text-indigo-600 mb-2 font-medium">AI 建議標籤</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.suggested_tags.map((tag, i) => (
                    <span key={i} className="px-2.5 py-1 bg-indigo-100 text-indigo-600 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Fields */}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {label} {required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={key === "email" ? "email" : "text"}
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={label}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            ))}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    儲存中...
                  </>
                ) : (
                  "儲存名片"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}