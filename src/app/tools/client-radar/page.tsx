"use client";

import { useState } from "react";
import Link from "next/link";

interface Report {
  company_name: string;
  main_business: string;
  company_type: string;
  scale: string;
  target_market: string;
  products: string;
  strengths: string;
  pain_points: string;
  approach_strategy: string;
  rating: string;
  rating_reason: string;
}

const RATING_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  B: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  C: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
};

function getRatingLevel(rating: string): string {
  if (rating?.includes("A")) return "A";
  if (rating?.includes("B")) return "B";
  return "C";
}

const LOADING_TEXTS = [
  "正在访问目标网站...",
  "正在读取网站内容...",
  "AI 正在分析公司信息...",
  "正在生成客户画像...",
];

export default function ClientRadarPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [analyzedUrl, setAnalyzedUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setReport(null);

    // 模拟进度文字
    let i = 0;
    setLoadingText(LOADING_TEXTS[0]);
    const timer = setInterval(() => {
      i = Math.min(i + 1, LOADING_TEXTS.length - 1);
      setLoadingText(LOADING_TEXTS[i]);
    }, 2500);

    try {
      const res = await fetch("/api/tools/client-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setReport(data.report);
        setAnalyzedUrl(data.url);
      }
    } catch {
      setError("网络异常，请重试");
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  const copyReport = () => {
    if (!report) return;
    const text = `客户画像报告 — ${report.company_name}
网址：${analyzedUrl}

【主营业务】${report.main_business}
【公司定位】${report.company_type}
【规模评估】${report.scale}
【目标市场】${report.target_market}
【核心产品】${report.products}
【公司优势】${report.strengths}
【采购痛点】${report.pain_points}
【开发建议】${report.approach_strategy}
【客户评级】${report.rating}
【评级理由】${report.rating_reason}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ratingLevel = report ? getRatingLevel(report.rating) : "C";
  const ratingStyle = RATING_STYLE[ratingLevel];

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">客户雷达</h1>
        <p className="text-sm text-gray-500 mt-1">
          输入客户网址，10 秒生成中文客户画像，洞察对方底细再出手
        </p>
      </div>

      {/* 输入区 */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">客户网址</label>
        <div className="flex gap-3">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleAnalyze()}
            placeholder="https://www.example.com"
            className="flex-1 px-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !url.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex-shrink-0"
          >
            {loading ? "分析中..." : "开始分析"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          支持任意公司官网，不需要登录的网站均可分析
        </p>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="bg-white rounded-xl border p-8 text-center mb-6">
          <div className="text-3xl mb-4 animate-pulse">🔍</div>
          <p className="text-sm font-medium text-gray-700">{loadingText}</p>
          <div className="mt-4 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-700">⚠️ {error}</p>
        </div>
      )}

      {/* 报告 */}
      {report && (
        <div className="space-y-4">
          {/* 头部 */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{report.company_name}</h2>
                <p className="text-sm text-gray-500 mt-1">{analyzedUrl}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
                    {report.company_type}
                  </span>
                  <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
                    {report.scale.split("，")[0]}
                  </span>
                  <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
                    {report.target_market}
                  </span>
                </div>
              </div>
              <div className={`flex-shrink-0 text-center px-4 py-3 rounded-xl border ${ratingStyle.bg} ${ratingStyle.border}`}>
                <p className={`text-2xl font-bold ${ratingStyle.text}`}>{ratingLevel}级</p>
                <p className={`text-xs mt-0.5 ${ratingStyle.text}`}>客户评级</p>
              </div>
            </div>
          </div>

          {/* 核心信息 */}
          <div className="grid grid-cols-1 gap-4">
            <Card title="🏢 主营业务" content={report.main_business} />
            <Card title="📦 核心产品" content={report.products} />
            <Card title="💪 公司优势" content={report.strengths} />
          </div>

          {/* 销售关键信息 */}
          <Card
            title="😤 采购痛点"
            content={report.pain_points}
            highlight
          />
          <Card
            title="🎯 开发建议 — 怎么打动他们"
            content={report.approach_strategy}
            highlight
            highlightColor="blue"
          />

          {/* 评级说明 */}
          <div className={`rounded-xl border p-4 ${ratingStyle.bg} ${ratingStyle.border}`}>
            <p className={`text-sm font-medium ${ratingStyle.text}`}>
              {report.rating}
            </p>
            <p className={`text-sm mt-1 ${ratingStyle.text} opacity-80`}>
              {report.rating_reason}
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={copyReport}
              className="flex-1 py-3 bg-white border rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {copied ? "已复制 ✓" : "复制报告"}
            </button>
            <Link
              href="/tools/cold-email"
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 text-center"
            >
              根据报告写开发信 →
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

function Card({
  title,
  content,
  highlight = false,
  highlightColor = "yellow",
}: {
  title: string;
  content: string;
  highlight?: boolean;
  highlightColor?: "yellow" | "blue";
}) {
  const bg = highlight
    ? highlightColor === "blue"
      ? "bg-blue-50 border-blue-100"
      : "bg-amber-50 border-amber-100"
    : "bg-white border-gray-100";

  const titleColor = highlight
    ? highlightColor === "blue"
      ? "text-blue-800"
      : "text-amber-800"
    : "text-gray-700";

  const textColor = highlight
    ? highlightColor === "blue"
      ? "text-blue-700"
      : "text-amber-700"
    : "text-gray-600";

  return (
    <div className={`rounded-xl border p-5 ${bg}`}>
      <p className={`text-sm font-semibold mb-2 ${titleColor}`}>{title}</p>
      <p className={`text-sm leading-relaxed ${textColor}`}>{content}</p>
    </div>
  );
}
