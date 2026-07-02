"use client";

import { useState } from "react";
import Link from "next/link";

export default function RedeemPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ credits: number; balance: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) setError(data.error);
    else setResult(data);
  };

  return (
    <main className="flex items-center justify-center min-h-[70vh] px-4">
      <div className="bg-white rounded-2xl border p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">兑换次数</h1>
        <p className="text-sm text-gray-500 mb-6">输入兑换码，立即到账可用次数</p>

        {result ? (
          <div className="text-center py-4">
            <div className="text-5xl mb-4">🎉</div>
            <p className="text-lg font-bold text-gray-900">成功兑换 {result.credits} 次</p>
            <p className="text-sm text-gray-500 mt-1">当前剩余：<span className="font-semibold text-blue-600">{result.balance} 次</span></p>
            <Link href="/dashboard" className="block mt-6 w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium text-center hover:bg-blue-700">
              去使用
            </Link>
            <button onClick={() => { setResult(null); setCode(""); }} className="block mt-3 w-full text-sm text-gray-400 hover:text-gray-600">
              继续兑换
            </button>
          </div>
        ) : (
          <form onSubmit={handleRedeem} className="space-y-4">
            <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX" maxLength={14} required
              className="w-full px-4 py-3 border rounded-xl text-sm font-mono tracking-wider focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
            <button type="submit" disabled={loading || !code.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? "兑换中..." : "立即兑换"}
            </button>
          </form>
        )}

        <p className="text-xs text-gray-400 text-center mt-6">
          没有兑换码？加微信
        </p>
      </div>
    </main>
  );
}
