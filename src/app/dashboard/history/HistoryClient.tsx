"use client";

import { useState } from "react";
import Link from "next/link";

interface HistoryRecord {
  id: string;
  type: "cold_email" | "bulk_email";
  company: string | null;
  subject: string | null;
  body: string | null;
  meta: Record<string, string> | null;
  created_at: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) return "今天 " + d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "昨天 " + d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) +
    " " + d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function getTitle(r: HistoryRecord): string {
  if (r.type === "cold_email") {
    return r.meta?.product ? `开发信 — ${r.meta.product}` : "开发信";
  }
  return r.company || r.meta?.customer_email || "批量邮件";
}

export default function HistoryClient({ records }: { records: HistoryRecord[] }) {
  const [filter, setFilter] = useState<"all" | "cold_email" | "bulk_email">("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const keyword = search.trim().toLowerCase();

  const filtered = records.filter((r) => {
    if (filter !== "all" && r.type !== filter) return false;
    if (!keyword) return true;
    return (
      r.company?.toLowerCase().includes(keyword) ||
      r.subject?.toLowerCase().includes(keyword) ||
      r.meta?.customer_email?.toLowerCase().includes(keyword) ||
      r.meta?.product?.toLowerCase().includes(keyword) ||
      r.body?.toLowerCase().includes(keyword)
    );
  });

  const copyRecord = (r: HistoryRecord) => {
    const text = r.subject
      ? `Subject: ${r.subject}\n\n${r.body ?? ""}`
      : (r.body ?? "");
    navigator.clipboard.writeText(text);
    setCopiedId(r.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      {/* 标题 */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
            ← 会员中心
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">历史记录</h1>
          <p className="text-sm text-gray-500 mt-1">共 {records.length} 条生成记录</p>
        </div>
      </div>

      {/* 搜索 */}
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索邮箱、公司名、主题关键词..."
          className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
            ✕
          </button>
        )}
      </div>

      {/* 筛选 */}
      <div className="flex gap-2 mb-6">
        {(["all", "cold_email", "bulk_email"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-white border text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f === "all" ? "全部" : f === "cold_email" ? "开发信" : "批量邮件"}
            <span className="ml-1.5 text-xs opacity-70">
              ({f === "all" ? records.length : records.filter((r) => r.type === f).length})
            </span>
          </button>
        ))}
      </div>

      {/* 列表 */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-sm">{keyword ? `没有找到「${search}」相关的记录` : "暂无记录"}</p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link href="/tools/cold-email" className="text-sm text-blue-600 hover:underline">
              去生成开发信 →
            </Link>
            <Link href="/tools/bulk-email" className="text-sm text-blue-600 hover:underline">
              去批量生成 →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${
                      r.type === "cold_email"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {r.type === "cold_email" ? "开发信" : "批量"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {getTitle(r)}
                    </p>
                    {r.subject && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{r.subject}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <span className="text-xs text-gray-400">{formatDate(r.created_at)}</span>
                  <span className="text-gray-300 text-xs">{expandedId === r.id ? "▲" : "▼"}</span>
                </div>
              </button>

              {expandedId === r.id && (
                <div className="border-t px-5 py-4">
                  {r.subject && (
                    <div className="mb-3">
                      <span className="text-xs font-medium text-gray-500">Subject: </span>
                      <span className="text-sm text-gray-800">{r.subject}</span>
                    </div>
                  )}
                  {r.meta && r.type === "cold_email" && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {r.meta.product && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {r.meta.product}
                        </span>
                      )}
                      {r.meta.market && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {r.meta.market}
                        </span>
                      )}
                      {r.meta.type && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {r.meta.type}
                        </span>
                      )}
                    </div>
                  )}
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-lg p-4">
                    {r.body ?? "（内容为空）"}
                  </pre>
                  <div className="mt-3 flex gap-2 justify-end">
                    <button
                      onClick={() => copyRecord(r)}
                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {copiedId === r.id ? "已复制 ✓" : "复制内容"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
