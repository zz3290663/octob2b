"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import UpgradeModal from "@/components/UpgradeModal";

const EMAIL_TYPES = [
  { value: "冷开发信", label: "冷开发信", desc: "首次联系目标客户" },
  { value: "跟进信", label: "跟进信", desc: "对方未回复时持续跟进" },
  { value: "报价跟进", label: "报价跟进", desc: "发完报价后催单" },
  { value: "询盘回复", label: "询盘回复", desc: "专业回复客户询盘" },
];

const STYLES = [
  { value: "formal", label: "Formal", desc: "商务正式，适合大客户" },
  { value: "casual", label: "Casual", desc: "轻松友好，适合中小买家" },
  { value: "direct", label: "Direct", desc: "开门见山，适合时间紧的采购" },
];

export default function ColdEmailPage() {
  const [profile, setProfile] = useState<{ credits: number; is_premium: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const supabase = createClient();

  // 表单状态
  const [type, setType] = useState("冷开发信");
  const [style, setStyle] = useState("formal");
  const [product, setProduct] = useState("");
  const [market, setMarket] = useState("");
  const [advantages, setAdvantages] = useState("");
  const [priceRange, setPriceRange] = useState("mid-range");
  const [moq, setMoq] = useState("");
  const [context, setContext] = useState("");

  // 生成状态
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from("profile").select("credits, is_premium").eq("id", data.user.id).single()
          .then(({ data }) => setProfile(data));
      }
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    if (!product.trim() || !market.trim()) {
      setError("请填写产品名称和目标市场");
      return;
    }

    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/tools/cold-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, style, product, market, advantages, priceRange, moq, context }),
      });

      const data = await res.json();

      if (res.status === 403 && data.error === "free_limit") {
        setShowModal(true);
        return;
      }

      if (!res.ok) {
        setError(data.error || "生成失败，请重试");
        return;
      }

      setResult(data.email);
      setProfile({
        credits: data.remaining,
        is_premium: data.isPremium,
      });
    } catch {
      setError("网络异常，请重试");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    setResult(null);
    handleGenerate();
  };

  if (loading) return null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">开发信生成器</h1>
      <p className="mt-1 text-sm text-gray-500">
        {profile?.is_premium
          ? "会员无限次使用"
          : `今日剩余：${profile?.credits ?? 0} 次`}
      </p>

      {/* 表单 */}
      <div className="mt-8 bg-white rounded-2xl p-6 border space-y-6">
        {/* 写信类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">写信类型</label>
          <div className="grid grid-cols-2 gap-3">
            {EMAIL_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`p-3 rounded-xl border text-left transition ${
                  type === t.value
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="font-medium text-sm">{t.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 风格 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">写作风格</label>
          <div className="flex gap-3">
            {STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStyle(s.value)}
                className={`flex-1 p-3 rounded-xl border text-center transition ${
                  style === s.value
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="font-medium text-sm">{s.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 产品 + 市场 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              产品/服务名称 <span className="text-red-500">*</span>
            </label>
            <input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="如：Solar Panels"
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              目标市场/国家 <span className="text-red-500">*</span>
            </label>
            <input
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              placeholder="如：Germany"
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* 公司优势 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">公司优势/卖点</label>
          <input
            value={advantages}
            onChange={(e) => setAdvantages(e.target.value)}
            placeholder="如：25-year warranty, TÜV certified"
            className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* 价格 + MOQ */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">价格区间</label>
            <select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="budget">Budget（低价）</option>
              <option value="mid-range">Mid-range（中端）</option>
              <option value="premium">Premium（高端）</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">最小起订量</label>
            <input
              value={moq}
              onChange={(e) => setMoq(e.target.value)}
              placeholder="如：100 pcs"
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* 背景（跟进/报价跟进/询盘回复需要） */}
        {(type === "跟进信" || type === "报价跟进" || type === "询盘回复") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              补充背景（可选）
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder={
                type === "跟进信"
                  ? "如：首封邮件发送3周未回复"
                  : type === "报价跟进"
                  ? "如：2周前发了报价单，未收到反馈"
                  : "如：客户询问OEM定制及大批量采购折扣"
              }
              rows={2}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {/* 生成按钮 */}
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? "生成中..." : "生成开发信"}
        </button>
      </div>

      {/* 结果展示 */}
      {result && (
        <div className="mt-6 bg-white rounded-2xl p-6 border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">生成结果</h3>
            <div className="flex gap-2">
              <button
                onClick={handleRegenerate}
                disabled={generating}
                className="text-sm text-gray-500 hover:text-blue-600 disabled:opacity-50"
              >
                重新生成
              </button>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-5 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
            {result}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              {copied ? "已复制 ✅" : "复制内容"}
            </button>
            <button
              onClick={handleRegenerate}
              disabled={generating}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              换一封
            </button>
          </div>
        </div>
      )}

      {/* 免责声明 */}
      <p className="mt-6 text-xs text-gray-400 text-center">
        AI 生成内容仅供参考，使用者自行承担合规责任
      </p>

      {/* 升级弹窗 */}
      {showModal && <UpgradeModal onClose={() => setShowModal(false)} />}
    </main>
  );
}