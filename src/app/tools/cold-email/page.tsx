"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import UpgradeModal from "@/components/UpgradeModal";

// ── 系统模板 ───────────────────────────────────────────────────────────────────
const SYSTEM_TEMPLATES = [
  { key: "cold_classic",   icon: "📧", label: "冷开发信经典款", desc: "首次联系，直击痛点，争取回复" },
  { key: "company_intro",  icon: "🏢", label: "专业公司介绍款", desc: "展示实力，建立专业可信的供应商形象" },
  { key: "quote_followup", icon: "💰", label: "报价后跟进款",   desc: "跟进无回复的报价，温和推动决策" },
  { key: "reactivate",     icon: "🔄", label: "老客户唤醒款",   desc: "重新联系沉睡客户，重燃合作兴趣" },
  { key: "new_product",    icon: "🆕", label: "新品推荐款",     desc: "向老客户介绍新产品，激发采购意向" },
  { key: "holiday",        icon: "🎉", label: "节日问候款",     desc: "节日维系关系，自然不生硬" },
  { key: "order_push",     icon: "🛒", label: "老客户催单款",   desc: "催促老客户复购，自然不尴尬" },
  { key: "visit_request",  icon: "✈️", label: "上门拜访预约款", desc: "预约登门拜访，提高见面成功率" },
  { key: "expo_invite",    icon: "🏛️", label: "展会邀约款",     desc: "邀请客户参观展位，制造线下接触机会" },
  { key: "meeting_invite", icon: "💻", label: "线上会议邀约款", desc: "预约视频会议，快速推进合作谈判" },
];

const STYLES = [
  { value: "formal", label: "Formal", desc: "正式商务" },
  { value: "casual", label: "Casual", desc: "轻松友好" },
  { value: "direct", label: "Direct", desc: "开门见山" },
];

interface MyTemplate {
  id: string;
  name: string;
  subject: string | null;
  body: string;
  scenario: string | null;
  created_at: string;
}

export default function ColdEmailPage() {
  const [profile, setProfile] = useState<{ credits: number; is_premium: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const supabase = createClient();

  // 模板 Tab
  const [templateTab, setTemplateTab] = useState<"system" | "mine">("system");
  const [selectedTemplate, setSelectedTemplate] = useState("cold_classic");
  const [myTemplates, setMyTemplates] = useState<MyTemplate[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);

  // 表单
  const [style, setStyle] = useState("formal");
  const [product, setProduct] = useState("");
  const [market, setMarket] = useState("");
  const [advantages, setAdvantages] = useState("");
  const [priceRange, setPriceRange] = useState("mid-range");
  const [moq, setMoq] = useState("");
  const [context, setContext] = useState("");
  const [regionalExp, setRegionalExp] = useState("");

  // 生成状态
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 保存模板
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

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

  // 切换到"我的模板" Tab 时加载
  const loadMyTemplates = async () => {
    setLoadingMine(true);
    const res = await fetch("/api/templates");
    const data = await res.json();
    setMyTemplates(data.templates ?? []);
    setLoadingMine(false);
  };

  const handleTabChange = (tab: "system" | "mine") => {
    setTemplateTab(tab);
    if (tab === "mine") loadMyTemplates();
  };

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
        body: JSON.stringify({ templateKey: selectedTemplate, style, product, market, advantages, priceRange, moq, context, regionalExp }),
      });
      const data = await res.json();

      if (res.status === 403 && data.error === "free_limit") { setShowModal(true); return; }
      if (!res.ok) { setError(data.error || "生成失败，请重试"); return; }

      setResult(data.email);
      setProfile({ credits: data.remaining, is_premium: data.isPremium });
    } catch {
      setError("网络异常，请重试");
    } finally {
      setGenerating(false);
    }
  };

  const handleUseMyTemplate = (t: MyTemplate) => {
    const text = t.subject ? `Subject: ${t.subject}\n\n${t.body}` : t.body;
    setResult(text);
    setTemplateTab("system"); // 回到主视图显示结果
  };

  const handleDeleteMyTemplate = async (id: string) => {
    if (!confirm("确定删除这个模板吗？")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    setMyTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveTemplate = async () => {
    if (!saveName.trim() || !result) return;
    setSaving(true);
    setSaveMsg(null);

    // 从 result 里提取 subject（如果有 "Subject: ..." 格式）
    const subjectMatch = result.match(/^Subject:\s*(.+)/i);
    const subject = subjectMatch?.[1]?.trim() ?? null;
    const body = subjectMatch ? result.replace(/^Subject:.*\n+/i, "").trim() : result;

    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: saveName.trim(),
        subject,
        body,
        scenario: SYSTEM_TEMPLATES.find((t) => t.key === selectedTemplate)?.label ?? null,
      }),
    });
    if (res.ok) {
      setSaveMsg("保存成功 ✓");
      setTimeout(() => { setShowSaveModal(false); setSaveName(""); setSaveMsg(null); }, 1200);
    } else {
      setSaveMsg("保存失败，请重试");
    }
    setSaving(false);
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">开发信生成器</h1>
      <p className="mt-1 text-sm text-gray-500">
        {profile?.is_premium ? "会员无限次使用" : `今日剩余：${profile?.credits ?? 0} 次`}
      </p>

      {/* ── 模板选择器 ── */}
      <div className="mt-8 bg-white rounded-2xl p-6 border">

        {/* Tab 切换 */}
        <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => handleTabChange("system")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${templateTab === "system" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            系统模板
          </button>
          <button
            onClick={() => handleTabChange("mine")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${templateTab === "mine" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            我的模板 {myTemplates.length > 0 && <span className="ml-1 text-xs text-blue-500">{myTemplates.length}</span>}
          </button>
        </div>

        {/* 系统模板 */}
        {templateTab === "system" && (
          <div className="grid grid-cols-2 gap-3">
            {SYSTEM_TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => setSelectedTemplate(t.key)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedTemplate === t.key
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{t.icon}</span>
                  <p className={`text-sm font-semibold ${selectedTemplate === t.key ? "text-blue-700" : "text-gray-800"}`}>
                    {t.label}
                  </p>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{t.desc}</p>
              </button>
            ))}
          </div>
        )}

        {/* 我的模板 */}
        {templateTab === "mine" && (
          <div>
            {loadingMine ? (
              <div className="py-8 text-center text-sm text-gray-400">加载中...</div>
            ) : myTemplates.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-gray-400 text-sm">还没有保存的模板</p>
                <p className="text-gray-400 text-xs mt-1">生成一封满意的邮件后，点「保存为我的模板」</p>
                <button onClick={() => handleTabChange("system")} className="mt-4 text-sm text-blue-600 hover:underline">
                  去用系统模板生成 →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myTemplates.map((t) => (
                  <div key={t.id} className="border rounded-xl p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                        {t.scenario && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                            {t.scenario}
                          </span>
                        )}
                        {t.subject && (
                          <p className="text-xs text-gray-400 mt-1 truncate">主题：{t.subject}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{t.body.slice(0, 80)}...</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleUseMyTemplate(t)}
                          className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          使用
                        </button>
                        <button
                          onClick={() => handleDeleteMyTemplate(t.id)}
                          className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 表单 ── */}
      {templateTab === "system" && (
        <div className="mt-4 bg-white rounded-2xl p-6 border space-y-5">

          {/* 写作风格 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">写作风格</label>
            <div className="flex gap-3">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={`flex-1 p-3 rounded-xl border text-center transition ${
                    style === s.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:border-gray-300"
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
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
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
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
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
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>

          {/* 价格 + MOQ */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">价格区间</label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
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
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          {/* 国家/地区经验 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              国家/地区经验 <span className="text-gray-400 font-normal">（可选）</span>
            </label>
            <input
              value={regionalExp}
              onChange={(e) => setRegionalExp(e.target.value)}
              placeholder="如：在尼日利亚有3个长期客户，合作超过2年；在德国出口5年，服务30+客户"
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">AI 会将此经验自然融入邮件，增加可信度</p>
          </div>

          {/* 额外要求 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              额外要求 <span className="text-gray-400 font-normal">（可选）</span>
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder={
                selectedTemplate === "quote_followup"  ? "如：2周前发了报价单，未收到反馈；或：重点强调我们可以提供30天账期"
                : selectedTemplate === "reactivate"    ? "如：上次合作是2年前，客户买过100套；或：这次想推荐升级款"
                : selectedTemplate === "new_product"   ? "如：客户以前买过A款，新推出B款更省电"
                : selectedTemplate === "order_push"    ? "如：上次订单是3个月前，客户通常每季度复购"
                : selectedTemplate === "visit_request" ? "如：下月初去德国出差，希望顺道登门拜访"
                : selectedTemplate === "expo_invite"   ? "如：2024广交会，10月15-19日，A馆3楼B21展位"
                : selectedTemplate === "meeting_invite"? "如：希望介绍新款产品，讨论年度采购计划，30分钟"
                : selectedTemplate === "holiday"       ? "如：即将到来的圣诞节；或：顺带提一下我们Q1有促销活动"
                : "告诉 AI 你想重点强调什么，或对邮件有什么特殊要求"
              }
              rows={2}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">AI 会按照你的要求调整邮件内容</p>
          </div>

          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {generating ? "生成中..." : `生成「${SYSTEM_TEMPLATES.find((t) => t.key === selectedTemplate)?.label}」`}
          </button>
        </div>
      )}

      {/* ── 结果展示 ── */}
      {result && (
        <div className="mt-6 bg-white rounded-2xl p-6 border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">生成结果</h3>
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
              onClick={() => { setResult(null); handleGenerate(); }}
              disabled={generating}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              换一封
            </button>
            <button
              onClick={() => { setSaveName(""); setShowSaveModal(true); }}
              className="flex-1 py-2.5 border border-blue-200 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50"
            >
              保存为模板
            </button>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-gray-400 text-center">AI 生成内容仅供参考，使用者自行承担合规责任</p>

      {/* 升级弹窗 */}
      {showModal && <UpgradeModal onClose={() => setShowModal(false)} />}

      {/* 保存模板弹窗 */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">保存为我的模板</h3>
            <p className="text-sm text-gray-500 mb-4">方便下次直接使用</p>
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="给这个模板起个名字，如：太阳能板开发信v1"
              className="w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-3"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()}
            />
            {saveMsg && (
              <p className={`text-sm mb-3 ${saveMsg.includes("成功") ? "text-green-600" : "text-red-500"}`}>
                {saveMsg}
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowSaveModal(false)} className="flex-1 py-2.5 border rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                取消
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={saving || !saveName.trim()}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
