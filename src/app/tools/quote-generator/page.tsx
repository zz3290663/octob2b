"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface LineItem {
  id: number;
  name: string;
  spec: string;
  quantity: number;
  unit: string;
  material: string;
  unit_price: string;
  notes: string;
}

interface CompanyProfile {
  company_name_en: string;
  company_name_cn: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  payment_terms: string;
  delivery_days: number;
  validity_days: number;
  bank_info: string;
}

type Step = "input" | "edit" | "preview";

let nextId = 1;
const newItem = (): LineItem => ({
  id: nextId++,
  name: "",
  spec: "",
  quantity: 1,
  unit: "pcs",
  material: "",
  unit_price: "",
  notes: "",
});

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function quoteNo() {
  const now = new Date();
  return `QT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

function calcAmount(qty: number, price: string) {
  const p = parseFloat(price);
  if (isNaN(p) || isNaN(qty)) return null;
  return qty * p;
}

function fmtAmt(n: number | null) {
  if (n === null) return "-";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function QuoteGeneratorPage() {
  const [step, setStep] = useState<Step>("input");
  const [rawText, setRawText] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [items, setItems] = useState<LineItem[]>([newItem()]);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [companyLoaded, setCompanyLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [quoteNumber] = useState(() => quoteNo());
  const [quoteDate] = useState(() => formatDate(new Date()));

  useEffect(() => {
    fetch("/api/company-profile")
      .then(r => r.json())
      .then(data => {
        if (data && !data.error && data.company_name_en) setCompany(data);
      })
      .finally(() => setCompanyLoaded(true));
  }, []);

  const handleParse = async () => {
    if (!rawText.trim()) { setParseError("请输入客户需求文字"); return; }
    setParsing(true);
    setParseError(null);
    try {
      const res = await fetch("/api/tools/quote-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });
      const data = await res.json();
      if (data.error) { setParseError(data.error); return; }
      const parsed: LineItem[] = data.items.map((it: Omit<LineItem, "id" | "unit_price">) => ({
        ...it,
        id: nextId++,
        unit_price: "",
      }));
      setItems(parsed.length > 0 ? parsed : [newItem()]);
      setStep("edit");
    } catch {
      setParseError("网络异常，请重试");
    } finally {
      setParsing(false);
    }
  };

  const updateItem = useCallback((id: number, key: keyof LineItem, value: string | number) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [key]: value } : it));
  }, []);

  const removeItem = useCallback((id: number) => {
    setItems(prev => prev.length > 1 ? prev.filter(it => it.id !== id) : prev);
  }, []);

  const addItem = () => setItems(prev => [...prev, newItem()]);

  const total = items.reduce((sum, it) => {
    const a = calcAmount(it.quantity, it.unit_price);
    return a !== null ? sum + a : sum;
  }, 0);

  const hasAnyPrice = items.some(it => it.unit_price !== "");

  // ── Build plain-text quote ────────────────────────────────────────────────
  const buildPlainText = () => {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (company?.validity_days ?? 30));

    const lines: string[] = [];
    const sep = "─".repeat(72);

    if (company?.company_name_en) lines.push(company.company_name_en.toUpperCase());
    if (company?.company_name_cn) lines.push(company.company_name_cn);
    if (company?.address) lines.push(company.address);
    const contacts = [company?.phone, company?.email, company?.website].filter(Boolean).join("  |  ");
    if (contacts) lines.push(contacts);
    lines.push("");
    lines.push(sep);
    lines.push("QUOTATION");
    lines.push(sep);
    lines.push("");
    if (customerName) lines.push(`To: ${customerName}`);
    lines.push(`Quotation No.: ${quoteNumber}`);
    lines.push(`Date: ${quoteDate}`);
    lines.push(`Valid Until: ${formatDate(validUntil)}`);
    lines.push("");
    lines.push(sep);

    const colWidths = [3, 22, 18, 6, 5, 11, 12, 18];
    const headers = ["#", "Description", "Specification", "Qty", "Unit", "Unit Price", "Amount", "Notes"];
    const header = headers.map((h, i) => h.padEnd(colWidths[i])).join(" ");
    lines.push(header);
    lines.push("─".repeat(header.length));

    items.forEach((it, idx) => {
      const amt = calcAmount(it.quantity, it.unit_price);
      const row = [
        String(idx + 1).padEnd(colWidths[0]),
        it.name.slice(0, colWidths[1] - 1).padEnd(colWidths[1]),
        (it.spec || "-").slice(0, colWidths[2] - 1).padEnd(colWidths[2]),
        String(it.quantity).padEnd(colWidths[3]),
        it.unit.padEnd(colWidths[4]),
        (it.unit_price ? "$" + it.unit_price : "-").padEnd(colWidths[5]),
        fmtAmt(amt).padEnd(colWidths[6]),
        (it.notes || "").slice(0, colWidths[7] - 1),
      ].join(" ");
      lines.push(row);
    });

    lines.push("─".repeat(header.length));
    if (hasAnyPrice) {
      lines.push(`${"".padEnd(colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 4)}TOTAL${" ".repeat(colWidths[5] - 5)}${fmtAmt(total)}`);
    }
    lines.push("");
    lines.push(sep);
    lines.push("");
    if (company?.payment_terms) lines.push(`Payment Terms: ${company.payment_terms}`);
    lines.push(`Delivery: ${company?.delivery_days ?? 30} working days after receipt of deposit`);
    lines.push(`Validity: This quotation is valid for ${company?.validity_days ?? 30} days`);

    if (company?.bank_info) {
      lines.push("");
      lines.push("Bank Information:");
      lines.push(company.bank_info);
    }

    lines.push("");
    lines.push(sep);
    if (company?.company_name_en) lines.push(`${company.company_name_en}`);
    const signContact = [company?.phone, company?.email].filter(Boolean).join("  |  ");
    if (signContact) lines.push(signContact);

    return lines.join("\n");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildPlainText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ── Step 1: Input ─────────────────────────────────────────────────────────
  if (step === "input") return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">报价单生成器</h1>
        <p className="text-sm text-gray-500 mt-1">粘贴客户的需求文字，AI 自动解析产品条目，填写单价后生成报价单</p>
      </div>

      {companyLoaded && !company && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-amber-500 text-lg mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-medium text-amber-800">未配置公司信息</p>
            <p className="text-xs text-amber-700 mt-0.5">报价单将没有公司抬头。
              <Link href="/dashboard/company-profile" className="underline ml-1">立即配置 →</Link>
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">客户需求文字</label>
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            rows={8}
            placeholder={"把客户的需求原文粘贴在这里，可以是中文或英文，模糊描述也没关系。\n\n例如：\n需要一批不锈钢球阀，规格大概2寸，1000PSI压力等级，数量50个左右。\n另外还需要一些蝶阀，DN200，配手动操作，10个。"}
            className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none font-sans leading-relaxed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">客户名称（可选）</label>
          <input
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="如：Geo George / Omni Valve"
            className="w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {parseError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{parseError}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => { setItems([newItem()]); setStep("edit"); }}
            className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            手动填写
          </button>
          <button
            onClick={handleParse}
            disabled={parsing}
            className="flex-2 flex-grow py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {parsing ? "AI 解析中..." : "AI 自动解析 →"}
          </button>
        </div>
      </div>
    </main>
  );

  // ── Step 2: Edit Table ────────────────────────────────────────────────────
  if (step === "edit") return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <button onClick={() => setStep("input")} className="text-sm text-gray-400 hover:text-gray-600">← 重新输入</button>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">填写单价</h1>
          <p className="text-sm text-gray-500 mt-1">确认产品条目，填写单价后生成报价单</p>
        </div>
        <button
          onClick={() => setStep("preview")}
          className="mt-6 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
        >
          预览报价单 →
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs text-gray-500">
              <th className="px-3 py-3 text-left w-8">#</th>
              <th className="px-3 py-3 text-left min-w-36">品名</th>
              <th className="px-3 py-3 text-left min-w-36">规格</th>
              <th className="px-3 py-3 text-left w-20">数量</th>
              <th className="px-3 py-3 text-left w-20">单位</th>
              <th className="px-3 py-3 text-left min-w-28">材质</th>
              <th className="px-3 py-3 text-left w-28">单价 (USD) <span className="text-red-400">*</span></th>
              <th className="px-3 py-3 text-left w-24">小计</th>
              <th className="px-3 py-3 text-left min-w-28">备注</th>
              <th className="px-3 py-3 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const amt = calcAmount(it.quantity, it.unit_price);
              return (
                <tr key={it.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-3 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-3 py-2.5">
                    <input value={it.name} onChange={e => updateItem(it.id, "name", e.target.value)}
                      placeholder="产品名称"
                      className="w-full text-sm border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input value={it.spec} onChange={e => updateItem(it.id, "spec", e.target.value)}
                      placeholder="如：2inch, 1000PSI"
                      className="w-full text-sm border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input type="number" min={1} value={it.quantity}
                      onChange={e => updateItem(it.id, "quantity", Number(e.target.value))}
                      className="w-full text-sm border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input value={it.unit} onChange={e => updateItem(it.id, "unit", e.target.value)}
                      placeholder="pcs"
                      className="w-full text-sm border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input value={it.material} onChange={e => updateItem(it.id, "material", e.target.value)}
                      placeholder="如：SS316"
                      className="w-full text-sm border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 text-xs">$</span>
                      <input value={it.unit_price} onChange={e => updateItem(it.id, "unit_price", e.target.value)}
                        type="number" min={0} step="0.01" placeholder="0.00"
                        className="w-full text-sm border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-sm font-medium text-gray-700 whitespace-nowrap">
                    {fmtAmt(amt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <input value={it.notes} onChange={e => updateItem(it.id, "notes", e.target.value)}
                      placeholder="备注"
                      className="w-full text-sm border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => removeItem(it.id)}
                      className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {hasAnyPrice && (
            <tfoot>
              <tr className="border-t bg-gray-50">
                <td colSpan={7} className="px-3 py-3 text-right text-sm font-semibold text-gray-700">合计</td>
                <td className="px-3 py-3 text-sm font-bold text-blue-600 whitespace-nowrap">{fmtAmt(total)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <button onClick={addItem}
        className="mt-3 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg px-4 py-2 hover:bg-blue-50">
        + 添加一行
      </button>
    </main>
  );

  // ── Step 3: Preview ───────────────────────────────────────────────────────
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + (company?.validity_days ?? 30));

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => setStep("edit")} className="text-sm text-gray-400 hover:text-gray-600">← 返回编辑</button>
        <div className="flex gap-3">
          <button onClick={() => { setStep("input"); }}
            className="px-4 py-2.5 border rounded-xl text-sm text-gray-600 hover:bg-gray-50">
            重新开始
          </button>
          <button onClick={handleCopy}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            {copied ? "✓ 已复制" : "复制报价单"}
          </button>
        </div>
      </div>

      {/* Quote preview card */}
      <div className="bg-white rounded-xl border shadow-sm p-8 font-sans">
        {/* Header */}
        {company ? (
          <div className="mb-6 pb-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">{company.company_name_en}</h2>
            {company.company_name_cn && <p className="text-sm text-gray-600 mt-0.5">{company.company_name_cn}</p>}
            {company.address && <p className="text-xs text-gray-500 mt-2">{company.address}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              {company.phone && <span className="text-xs text-gray-500">📞 {company.phone}</span>}
              {company.email && <span className="text-xs text-gray-500">✉️ {company.email}</span>}
              {company.website && <span className="text-xs text-gray-500">🌐 {company.website}</span>}
            </div>
          </div>
        ) : (
          <div className="mb-6 pb-6 border-b">
            <p className="text-sm text-gray-400 italic">（未配置公司信息 — <Link href="/dashboard/company-profile" className="text-blue-500 underline">去配置</Link>）</p>
          </div>
        )}

        {/* Title row */}
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-wide">QUOTATION</h1>
          <div className="text-right text-sm text-gray-600 space-y-0.5">
            {customerName && <p><span className="text-gray-400">To:</span> {customerName}</p>}
            <p><span className="text-gray-400">No.:</span> {quoteNumber}</p>
            <p><span className="text-gray-400">Date:</span> {quoteDate}</p>
            <p><span className="text-gray-400">Valid Until:</span> {formatDate(validUntil)}</p>
          </div>
        </div>

        {/* Items table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white text-xs">
                <th className="px-3 py-2.5 text-left w-8">#</th>
                <th className="px-3 py-2.5 text-left">Description</th>
                <th className="px-3 py-2.5 text-left">Specification</th>
                <th className="px-3 py-2.5 text-right">Qty</th>
                <th className="px-3 py-2.5 text-left">Unit</th>
                <th className="px-3 py-2.5 text-right">Unit Price</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const amt = calcAmount(it.quantity, it.unit_price);
                return (
                  <tr key={it.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2.5 text-gray-400 text-xs border-b border-gray-100">{idx + 1}</td>
                    <td className="px-3 py-2.5 border-b border-gray-100">
                      <div className="font-medium text-gray-900">{it.name || "-"}</div>
                      {it.material && <div className="text-xs text-gray-500">Material: {it.material}</div>}
                      {it.notes && <div className="text-xs text-gray-400 italic">{it.notes}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 border-b border-gray-100">{it.spec || "-"}</td>
                    <td className="px-3 py-2.5 text-right border-b border-gray-100">{it.quantity}</td>
                    <td className="px-3 py-2.5 text-gray-600 border-b border-gray-100">{it.unit}</td>
                    <td className="px-3 py-2.5 text-right border-b border-gray-100">
                      {it.unit_price ? `$${parseFloat(it.unit_price).toFixed(2)}` : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium border-b border-gray-100">
                      {fmtAmt(amt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {hasAnyPrice && (
              <tfoot>
                <tr className="bg-gray-800 text-white">
                  <td colSpan={5} />
                  <td className="px-3 py-3 text-right text-sm font-semibold">TOTAL</td>
                  <td className="px-3 py-3 text-right text-sm font-bold">{fmtAmt(total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Terms */}
        <div className="grid grid-cols-3 gap-4 text-sm mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">Payment Terms</p>
            <p className="text-gray-700">{company?.payment_terms || "T/T 30% deposit, 70% before shipment"}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">Delivery</p>
            <p className="text-gray-700">{company?.delivery_days ?? 30} days after deposit</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">Validity</p>
            <p className="text-gray-700">{company?.validity_days ?? 30} days</p>
          </div>
        </div>

        {/* Bank info */}
        {company?.bank_info && (
          <div className="border-t pt-4 mt-4">
            <p className="text-xs font-semibold text-gray-500 mb-1">Bank Information</p>
            <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap">{company.bank_info}</pre>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">点击"复制报价单"获取纯文本版本，可直接粘贴到邮件中发送</p>
    </main>
  );
}
