"use client";

import { useState, useRef, useCallback } from "react";

// ── CSV 解析 ──────────────────────────────────────────────────────────────────
function parseCSV(text: string): { fields: string[]; data: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (lines.length < 2) return { fields: [], data: [] };
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = "", inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQuote && line[i + 1] === '"') { cur += '"'; i++; } else inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { result.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    result.push(cur.trim());
    return result;
  };
  const fields = parseRow(lines[0]);
  const data = lines.slice(1).map(line => {
    const vals = parseRow(line);
    const row: Record<string, string> = {};
    fields.forEach((f, i) => { row[f] = vals[i] ?? ""; });
    return row;
  });
  return { fields, data };
}

const URL_ALIASES = ["url", "website", "web", "site", "网址", "网站"];
const EMAIL_ALIASES = ["email", "e-mail", "mail", "邮箱", "电子邮件"];
const NAME_ALIASES = ["name", "contact", "contact name", "姓名", "联系人"];
const COMPANY_ALIASES = ["company", "company name", "organization", "公司", "公司名称"];
const PREV_SUBJECT_ALIASES = ["previous_subject", "prev_subject", "last_subject", "上封主题", "上次主题"];
const FOLLOW_UP_NUM_ALIASES = ["follow_up_number", "follow_up_num", "followup_num", "第几封", "跟进次数"];

function detectCol(fields: string[], aliases: string[]): string {
  return fields.find(f => aliases.includes(f.toLowerCase().trim())) ?? "";
}

type Step = "upload" | "configure" | "processing" | "results";

interface Customer {
  url: string;
  email: string;
  name?: string;
  company?: string;
  previousSubject?: string;
  followUpNumber?: number;
}

interface Result {
  customer: Customer;
  company_name: string;
  main_business: string;
  pain_points: string;
  subject: string;
  body: string;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
}

const STYLES = [
  { value: "formal", label: "Formal", desc: "正式商务" },
  { value: "casual", label: "Casual", desc: "轻松友好" },
  { value: "direct", label: "Direct", desc: "开门见山" },
];

export default function SmartEmailPage() {
  const [step, setStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV 数据
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rawCount, setRawCount] = useState(0);

  // 配置
  const [product, setProduct] = useState("");
  const [market, setMarket] = useState("");
  const [advantages, setAdvantages] = useState("");
  const [priceRange, setPriceRange] = useState("mid-range");
  const [style, setStyle] = useState("formal");
  const [configError, setConfigError] = useState<string | null>(null);

  // 处理 & 结果
  const [results, setResults] = useState<Result[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ subject: "", body: "" });
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // 发送
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });
  const [sendResults, setSendResults] = useState<Record<number, "sent" | "failed">>({});
  const [showSendModal, setShowSendModal] = useState(false);

  const downloadTemplate = () => {
    const content = "url,email,name,company,previous_subject,follow_up_number\nhttps://www.example.com,john@example.com,John Smith,Acme Corp,,1\nhttps://www.example2.com,jane@example2.com,Jane Doe,Beta Ltd,Re: Solar Panel Quote,2";
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "智能开发信模板.csv";
    a.click();
  };

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) { alert("请上传 CSV 文件"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { fields, data } = parseCSV(text);
      const urlCol = detectCol(fields, URL_ALIASES);
      const emailCol = detectCol(fields, EMAIL_ALIASES);
      const nameCol = detectCol(fields, NAME_ALIASES);
      const companyCol = detectCol(fields, COMPANY_ALIASES);
      const prevSubjectCol = detectCol(fields, PREV_SUBJECT_ALIASES);
      const followUpNumCol = detectCol(fields, FOLLOW_UP_NUM_ALIASES);

      if (!urlCol || !emailCol) {
        alert("未找到 url 或 email 列，请下载模板后填写");
        return;
      }

      const valid = data
        .map(row => ({
          url: row[urlCol]?.trim(),
          email: row[emailCol]?.trim(),
          name: nameCol ? row[nameCol]?.trim() || undefined : undefined,
          company: companyCol ? row[companyCol]?.trim() || undefined : undefined,
          previousSubject: prevSubjectCol ? row[prevSubjectCol]?.trim() || undefined : undefined,
          followUpNumber: followUpNumCol ? parseInt(row[followUpNumCol]) || undefined : undefined,
        }))
        .filter(c => c.url && c.email);

      setRawCount(data.length);
      setCustomers(valid);
      setStep("configure");
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const handleGenerate = async () => {
    if (!product.trim() || !market.trim()) { setConfigError("请填写产品名称和目标市场"); return; }
    setConfigError(null);

    const initial: Result[] = customers.map(c => ({
      customer: c,
      company_name: c.company || "",
      main_business: "",
      pain_points: "",
      subject: "",
      body: "",
      status: "pending",
    }));
    setResults(initial);
    setProgress({ current: 0, total: customers.length });
    setStep("processing");

    for (let i = 0; i < customers.length; i++) {
      setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: "processing" } : r));

      try {
        const res = await fetch("/api/tools/smart-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...customers[i],
            product, market, advantages, priceRange, style,
          }),
        });
        const data = await res.json();
        if (data.error) {
          setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: "error", error: data.error } : r));
        } else {
          setResults(prev => prev.map((r, idx) => idx === i ? {
            ...r,
            company_name: data.company_name || r.customer.company || "",
            main_business: data.main_business || "",
            pain_points: data.pain_points || "",
            subject: data.subject || "",
            body: data.body || "",
            status: "done",
          } : r));
        }
      } catch {
        setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: "error", error: "网络异常" } : r));
      }

      setProgress(p => ({ ...p, current: i + 1 }));
    }
    setStep("results");
  };

  const handleSendAll = async () => {
    const toSend = results.filter(r => r.status === "done");
    setSending(true);
    setSendProgress({ current: 0, total: toSend.length });
    setShowSendModal(false);
    const newSendResults: Record<number, "sent" | "failed"> = {};

    for (let i = 0; i < toSend.length; i++) {
      const r = toSend[i];
      try {
        const res = await fetch("/api/email/send-one", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_email: r.customer.email,
            customer_company: r.company_name || r.customer.company || "",
            subject: r.subject,
            content: r.body,
          }),
        });
        const data = await res.json();
        newSendResults[i] = data.success ? "sent" : "failed";
      } catch {
        newSendResults[i] = "failed";
      }
      setSendResults({ ...newSendResults });
      setSendProgress(p => ({ ...p, current: i + 1 }));
      if (i < toSend.length - 1) await new Promise(r => setTimeout(r, 30000));
    }
    setSending(false);
  };

  const doneCount = results.filter(r => r.status === "done").length;

  // ── Step 1: Upload ─────────────────────────────────────────────────────────
  if (step === "upload") return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">智能开发信</h1>
        <p className="text-sm text-gray-500 mt-1">上传客户网址表格，AI 分析每个客户再写个性化开发信，一键批量发送</p>
      </div>

      <div
        className={`border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-colors ${isDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"}`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="text-5xl mb-4">🎯</div>
        <p className="text-gray-700 font-medium">拖拽 CSV 文件到这里，或点击选择</p>
        <p className="text-sm text-gray-400 mt-2">必须包含 url 和 email 两列</p>
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      <div className="mt-6 bg-white rounded-xl border p-6">
        <p className="text-sm font-medium text-gray-700 mb-3">CSV 格式说明</p>
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm mb-4">
          <div className="flex gap-1.5"><span className="text-red-500 font-bold">*</span><span className="text-gray-800">url — 客户网址（必填）</span></div>
          <div className="flex gap-1.5"><span className="text-red-500 font-bold">*</span><span className="text-gray-800">email — 客户邮箱（必填）</span></div>
          <div className="text-gray-500">name — 联系人姓名（可选）</div>
          <div className="text-gray-500">company — 公司名称（可选）</div>
          <div className="text-gray-500">previous_subject — 上封邮件主题（跟进时填）</div>
          <div className="text-gray-500">follow_up_number — 第几封（1=初次，2+=跟进）</div>
        </div>
        <p className="text-xs text-gray-400 mb-4">AI 会抓取每个网址，分析客户画像，再写针对性开发信 · 每个客户约需 15-20 秒</p>
        <button onClick={downloadTemplate}
          className="w-full py-2.5 border border-blue-200 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50">
          下载填写模板 (.csv)
        </button>
      </div>
    </main>
  );

  // ── Step 2: Configure ──────────────────────────────────────────────────────
  if (step === "configure") return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <button onClick={() => setStep("upload")} className="text-sm text-gray-400 hover:text-gray-600">← 重新上传</button>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">填写你的产品信息</h1>
        <p className="text-sm text-gray-500 mt-1">
          已识别 <span className="text-blue-600 font-medium">{customers.length}</span> 个有效客户
          <span className="text-gray-400 ml-2">（共 {rawCount} 行）</span>
        </p>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">写作风格</label>
          <div className="flex gap-3">
            {STYLES.map(s => (
              <button key={s.value} onClick={() => setStyle(s.value)}
                className={`flex-1 p-3 rounded-xl border text-center transition ${style === s.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:border-gray-300"}`}>
                <p className="font-medium text-sm">{s.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">产品/服务名称 <span className="text-red-500">*</span></label>
            <input value={product} onChange={e => setProduct(e.target.value)}
              placeholder="如：Solar Panels" className="w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目标市场/国家 <span className="text-red-500">*</span></label>
            <input value={market} onChange={e => setMarket(e.target.value)}
              placeholder="如：Germany" className="w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">公司优势/卖点</label>
          <input value={advantages} onChange={e => setAdvantages(e.target.value)}
            placeholder="如：25-year warranty, TÜV certified, factory direct"
            className="w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">价格区间</label>
          <select value={priceRange} onChange={e => setPriceRange(e.target.value)}
            className="w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="budget">Budget（低价）</option>
            <option value="mid-range">Mid-range（中端）</option>
            <option value="premium">Premium（高端）</option>
          </select>
        </div>

        {configError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{configError}</p>}

        <button onClick={handleGenerate}
          className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 text-sm">
          开始分析并生成 {customers.length} 封开发信
        </button>
        <p className="text-xs text-gray-400 text-center">每个客户约需 15-20 秒 · 请保持页面开启</p>
      </div>
    </main>
  );

  // ── Step 3: Processing ─────────────────────────────────────────────────────
  if (step === "processing") {
    const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
    const recentDone = results.filter(r => r.status === "done").slice(-2);
    const current = results.find(r => r.status === "processing");

    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">AI 正在分析客户并写邮件...</h1>
        <div className="bg-white rounded-xl border p-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>进度</span>
            <span>{progress.current} / {progress.total}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>

          {current && (
            <div className="mt-5 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <p className="text-xs font-medium text-blue-700">正在分析</p>
              </div>
              <p className="text-sm text-blue-800 truncate">{current.customer.url}</p>
            </div>
          )}

          {recentDone.length > 0 && (
            <div className="mt-4 space-y-2">
              {recentDone.map((r, i) => (
                <div key={i} className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 truncate">
                  ✅ {r.company_name || r.customer.url} — {r.subject}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── Step 4: Results ────────────────────────────────────────────────────────
  const errorCount = results.filter(r => r.status === "error").length;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">生成完成</h1>
        <p className="text-sm text-gray-500 mt-1">
          成功 <span className="text-green-600 font-medium">{doneCount}</span> 封
          {errorCount > 0 && <span className="text-red-500 ml-2">· 失败 {errorCount} 封</span>}
        </p>
      </div>

      {/* 发送确认 modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">确认发送</h3>
            <p className="text-sm text-gray-600 mb-1">将发送 <span className="font-medium text-blue-600">{doneCount}</span> 封个性化开发信</p>
            <p className="text-sm text-gray-500 mb-4">每封间隔 30 秒，请保持页面开启</p>
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              ⚠️ 每天最多发送 50 封
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSendModal(false)} className="flex-1 py-2.5 border rounded-xl text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={handleSendAll} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">确认发送</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={() => { setStep("upload"); setResults([]); setCustomers([]); }}
          className="py-2.5 px-4 bg-white border rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
          重新上传
        </button>
        <button onClick={() => setShowSendModal(true)} disabled={sending || doneCount === 0}
          className="py-2.5 px-4 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 ml-auto">
          {sending ? `发送中 ${sendProgress.current}/${sendProgress.total}...` : "批量发送"}
        </button>
      </div>

      <div className="space-y-3">
        {results.map((r, idx) => (
          <div key={idx} className="bg-white rounded-xl border overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.status === "done" ? "bg-green-400" : r.status === "error" ? "bg-red-400" : "bg-yellow-400 animate-pulse"}`} />
                {sendResults[idx] && (
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${sendResults[idx] === "sent" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {sendResults[idx] === "sent" ? "已发送" : "发送失败"}
                  </span>
                )}
                {r.customer.followUpNumber && r.customer.followUpNumber > 1 && (
                  <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full flex-shrink-0">
                    第{r.customer.followUpNumber}封跟进
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {r.company_name || r.customer.company || r.customer.url}
                  </p>
                  {r.subject && <p className="text-xs text-gray-500 truncate">{r.subject}</p>}
                  {r.status === "error" && <p className="text-xs text-red-500 truncate">{r.error}</p>}
                </div>
              </div>
              <span className="text-gray-400 ml-4 flex-shrink-0 text-xs">{expandedIdx === idx ? "▲" : "▼"}</span>
            </button>

            {expandedIdx === idx && r.status === "done" && (
              <div className="border-t px-5 py-4 space-y-4">
                {/* 客户画像摘要 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1">主营业务</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{r.main_business}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-700 mb-1">采购痛点</p>
                    <p className="text-xs text-amber-700 leading-relaxed">{r.pain_points}</p>
                  </div>
                </div>

                {/* 邮件 */}
                {editingIdx === idx ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Subject</label>
                      <input value={editForm.subject} onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))}
                        className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">正文</label>
                      <textarea value={editForm.body} onChange={e => setEditForm(f => ({ ...f, body: e.target.value }))}
                        rows={10} className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none resize-y font-sans" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingIdx(null)} className="text-xs px-3 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-50">取消</button>
                      <button onClick={() => {
                        setResults(prev => prev.map((res, i) => i === idx ? { ...res, subject: editForm.subject, body: editForm.body } : res));
                        setEditingIdx(null);
                      }} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start gap-3">
                      <p className="text-xs text-gray-500"><span className="font-medium text-gray-700">Subject: </span>{r.subject}</p>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => { setEditingIdx(idx); setEditForm({ subject: r.subject, body: r.body }); }}
                          className="text-xs px-3 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-50">编辑</button>
                        <button onClick={() => {
                          navigator.clipboard.writeText(`Subject: ${r.subject}\n\n${r.body}`);
                          setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 2000);
                        }} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                          {copiedIdx === idx ? "已复制 ✓" : "复制"}
                        </button>
                      </div>
                    </div>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{r.body}</pre>
                  </>
                )}
              </div>
            )}

            {expandedIdx === idx && r.status === "error" && (
              <div className="border-t px-5 py-4">
                <p className="text-sm text-red-500">⚠️ {r.error}</p>
                <p className="text-xs text-gray-400 mt-1">可能是网站无法访问或需要登录，请检查网址</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
