"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/api";

export default function Navbar() {
  const router = useRouter();

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