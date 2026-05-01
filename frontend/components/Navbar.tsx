"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/api";
import { useEffect, useState } from "react";

export default function Navbar() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem('smartcard_auth') || '{}');
    if (auth.token) {
      // Use relative path so it goes through Next.js proxy (Tunnel / localhost)
      fetch(`/api/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.is_admin) setIsAdmin(true);
        })
        .catch(() => {})
        .finally(() => setChecked(true));
    } else {
      setChecked(true);
    }
  }, []);

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 max-w-3xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/cards" className="text-lg font-bold text-indigo-600">
            SmartCard
          </Link>
          <Link
            href="/tags"
            className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
          >
            🏷️ 標籤
          </Link>
          {checked && isAdmin && (
            <Link
              href="/setup"
              className="text-sm bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1 rounded transition-colors"
            >
              ⚙️ 管理
            </Link>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          登出
        </button>
      </div>
    </header>
  );
}