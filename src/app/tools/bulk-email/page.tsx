"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

// 简易 CSV 解析（支持带引号的字段）
function parseCSVText(text: string): { fields: string[]; data: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (lines.length < 2) return { fields: [], data: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const fields = parseRow(lines[0]);
  const data = lines.slice(1).map((line) => {
    const vals = parseRow(line);
    const row: Record<string, string> = {};
    fields.forEach((f, i) => { row[f] = vals[i] ?? ""; });
    return row;
  });
  return { fields, data };
}

// CSV 导出
function toCSV(rows: Record<string, string>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [
    headers.map(escape).join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h] ?? "")).join(",")),
  ].join("\n");
}

type Step = "upload" | "configure" | "generating" | "results";

interface Customer {
  email: string;
  company?: string;
  name?: string;
  country?: string;
  product?: string;
  last_contact_date?: string;
  note?: string;
  position?: string;
  website?: string;
  customer_type?: string;
  previous_inquiry?: string;
}

interface EmailResult {
  customer: Customer;
  subject: string;
  body: string;
  status: "pending" | "generating" | "done" | "error";
}

const SCENARIOS = [
  { value: "reactivate", label: "老客户唤醒", desc: "重新联系长期未回复的老客户" },
  { value: "new_product", label: "新品推荐", desc: "向老客户介绍新产品" },
  { value: "quote_followup", label: "报价后跟进", desc: "发完报价后没有收到回复" },
  { value: "lost_deal", label: "未成交客户二次跟进", desc: "重新接触之前没有成交的客户" },
  { value: "holiday", label: "节日问候", desc: "节日维护客户关系" },
];

const FIELD_LABELS: Record<string, string> = {
  email: "邮箱（必填）",
  company: "公司名称",
  name: "联系人姓名",
  country: "国家/地区",
  product: "产品/意向产品",
  position: "职位",
  last_contact_date: "最后联系时间",
  note: "备注",
  website: "网站",
  customer_type: "客户类型",
  previous_inquiry: "历史询盘",
};

const FIELD_ALIASES: Record<string, string[]> = {
  email: ["email", "e-mail", "mail", "email address", "邮箱", "电子邮件"],
  company: ["company", "company name", "organization", "企业", "公司", "公司名称"],
  name: ["name", "contact name", "contact", "first name", "full name", "姓名", "联系人", "客户姓名"],
  country: ["country", "region", "location", "国家", "地区"],
  product: ["product", "products", "interest", "product interest", "产品", "兴趣产品", "意向产品"],
  position: ["position", "title", "job title", "role", "职位", "职务"],
  last_contact_date: ["last contact", "last contact date", "last contacted", "最后联系", "最后联系时间"],
  note: ["note", "notes", "remark", "remarks", "comment", "备注"],
  website: ["website", "web", "url", "网站"],
  customer_type: ["customer type", "type", "category", "客户类型", "分类"],
  previous_inquiry: ["previous inquiry", "inquiry", "inquiry content", "历史询盘", "询盘内容"],
};

function autoDetect(col: string): string | null {
  const lower = col.toLowerCase().trim();
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(lower)) return field;
  }
  return null;
}

export default function BulkEmailPage() {
  const [step, setStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [scenario, setScenario] = useState("reactivate");
  const [extra, setExtra] = useState("");
  const [results, setResults] = useState<EmailResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv") {
      alert("请上传 CSV 文件（Excel 请另存为 CSV 后上传）");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { fields, data } = parseCSVText(text);
      setRawData(data);
      setColumns(fields);
      const mapping: Record<string, string> = {};
      for (const col of fields) {
        const f = autoDetect(col);
        if (f && !mapping[f]) mapping[f] = col;
      }
      setFieldMapping(mapping);
      setStep("configure");
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const mapRow = (row: Record<string, string>): Customer => {
    const c: Record<string, string> = {};
    for (const [field, col] of Object.entries(fieldMapping)) {
      if (col && row[col] !== undefined && row[col] !== "") c[field] = row[col];
    }
    return c as unknown as Customer;
  };

  const validCustomers = rawData
    .map(mapRow)
    .filter((c) => c.email?.trim());

  const handleGenerate = async () => {
    const customers = validCustomers;
    setResults(customers.map((c) => ({ customer: c, subject: "", body: "", status: "pending" })));
    setProgress({ current: 0, total: customers.length });
    setStep("generating");

    for (let i = 0; i < customers.length; i++) {
      setResults((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "generating" } : r))
      );

      try {
        const res = await fetch("/api/tools/bulk-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer: customers[i], scenario, extraRequirements: extra }),
        });
        const data = await res.json();
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? { ...r, subject: data.subject || "", body: data.body || "", status: "done" }
              : r
          )
        );
      } catch {
        setResults((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: "error" } : r))
        );
      }

      setProgress((p) => ({ ...p, current: i + 1 }));
    }

    setStep("results");
  };

  const copyEmail = (r: EmailResult, idx: number) => {
    navigator.clipboard.writeText(`Subject: ${r.subject}\n\n${r.body}`);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob(["﻿" + content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const rows = results
      .filter((r) => r.status === "done")
      .map((r) => ({
        邮箱: r.customer.email,
        公司: r.customer.company || "",
        联系人: r.customer.name || "",
        主题: r.subject,
        内容: r.body,
      }));
    downloadFile("bulk-emails.csv", toCSV(rows), "text/csv;charset=utf-8;");
  };

  const exportTXT = () => {
    const sep = "=".repeat(52);
    const text = results
      .filter((r) => r.status === "done")
      .map(
        (r, i) =>
          `${sep}\n${i + 1}. ${r.customer.company || r.customer.email}${r.customer.name ? ` (${r.customer.name})` : ""}\n${sep}\nSubject: ${r.subject}\n\n${r.body}`
      )
      .join("\n\n");
    downloadFile("bulk-emails.txt", text, "text/plain;charset=utf-8;");
  };

  const doneCount = results.filter((r) => r.status === "done").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  // ── Upload ─────────────────────────────────────────────────────────────────
  if (step === "upload") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8">
          <Link href="/tools/cold-email" className="text-sm text-gray-400 hover:text-gray-600">
            ← 返回开发信工具
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">批量邮件生成</h1>
          <p className="text-sm text-gray-500 mt-1">
            上传客户表格，AI 为每位客户生成一封个性化邮件
          </p>
        </div>

        <div
          className={`border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-blue-400 bg-blue-50"
              : "border-gray-200 bg-white hover:border-blue-300"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-5xl mb-4">📂</div>
          <p className="text-gray-700 font-medium">拖拽文件到这里，或点击选择</p>
          <p className="text-sm text-gray-400 mt-2">支持 CSV 格式（Excel 请另存为 CSV 后上传）</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>

        <div className="mt-8 bg-white rounded-xl border p-6">
          <p className="text-sm font-medium text-gray-700 mb-3">表格字段说明</p>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            <div className="flex gap-1.5 items-center">
              <span className="text-red-500 font-bold">*</span>
              <span className="text-gray-800">email — 邮箱（必填）</span>
            </div>
            {["company — 公司名称", "name — 联系人姓名", "country — 国家", "product — 意向产品", "note — 备注"].map((f) => (
              <div key={f} className="text-gray-500">{f}</div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            列名中英文均可自动识别 · 字段越完整，邮件越个性化
          </p>
          <button
            onClick={() => {
              const header = "email,company,name,country,product,position,last_contact_date,note";
              const example = "john@acme.com,Acme Corp,John Smith,USA,Solar Panel,Purchasing Manager,2024-01-15,曾询价过100W产品";
              downloadFile("客户列表模板.csv", `${header}\n${example}`, "text/csv;charset=utf-8;");
            }}
            className="mt-4 w-full py-2.5 border border-blue-200 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
          >
            下载填写模板 (.csv)
          </button>
        </div>
      </main>
    );
  }

  // ── Configure ──────────────────────────────────────────────────────────────
  if (step === "configure") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8">
          <button
            onClick={() => setStep("upload")}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            ← 重新上传
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">配置生成选项</h1>
          <p className="text-sm text-gray-500 mt-1">
            已识别{" "}
            <span className="text-blue-600 font-medium">{validCustomers.length}</span> 位有效客户
            <span className="text-gray-400 ml-2">（共 {rawData.length} 行）</span>
          </p>
        </div>

        {/* Field mapping */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-1">字段映射</p>
          <p className="text-xs text-gray-400 mb-4">已自动识别，可手动调整</p>
          <div className="space-y-2.5">
            {Object.entries(FIELD_LABELS).map(([field, label]) => (
              <div key={field} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-32 flex-shrink-0">{label}</span>
                <select
                  value={fieldMapping[field] || ""}
                  onChange={(e) =>
                    setFieldMapping((prev) => ({ ...prev, [field]: e.target.value }))
                  }
                  className="flex-1 text-sm border rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">— 不导入 —</option>
                  {columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Scenario */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-4">发信场景</p>
          <div className="space-y-2">
            {SCENARIOS.map((s) => (
              <label
                key={s.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  scenario === s.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-100 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="scenario"
                  value={s.value}
                  checked={scenario === s.value}
                  onChange={(e) => setScenario(e.target.value)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">{s.label}</p>
                  <p className="text-xs text-gray-500">{s.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Extra requirements */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-1">
            补充要求{" "}
            <span className="text-gray-400 font-normal">（可选）</span>
          </p>
          <textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="例如：我们是做太阳能板的，主打性价比，目标客户是东南亚中小型工程商..."
            rows={3}
            className="w-full mt-2 text-sm border rounded-lg px-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={validCustomers.length === 0}
          className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          开始生成 {validCustomers.length} 封邮件
        </button>
      </main>
    );
  }

  // ── Generating ─────────────────────────────────────────────────────────────
  if (step === "generating") {
    const pct =
      progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
    const recentDone = results.filter((r) => r.status === "done").slice(-3);

    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">正在生成邮件...</h1>
        <div className="bg-white rounded-xl border p-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>进度</span>
            <span>
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">
            {progress.current < progress.total
              ? `正在生成第 ${progress.current + 1} 封...`
              : "即将完成"}
          </p>

          {recentDone.length > 0 && (
            <div className="mt-6 space-y-2">
              {recentDone.map((r, i) => (
                <div key={i} className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 truncate">
                  ✅ {r.customer.company || r.customer.email} — {r.subject}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">生成完成</h1>
        <p className="text-sm text-gray-500 mt-1">
          成功{" "}
          <span className="text-green-600 font-medium">{doneCount}</span> 封
          {errorCount > 0 && (
            <span className="text-red-500 ml-2">· 失败 {errorCount} 封</span>
          )}
        </p>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={exportCSV}
          className="flex-1 py-2.5 bg-white border rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          导出 CSV
        </button>
        <button
          onClick={exportTXT}
          className="flex-1 py-2.5 bg-white border rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          导出 TXT
        </button>
        <button
          onClick={() => {
            setStep("upload");
            setResults([]);
            setRawData([]);
          }}
          className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
        >
          重新上传
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
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    r.status === "done"
                      ? "bg-green-400"
                      : r.status === "error"
                      ? "bg-red-400"
                      : "bg-yellow-400 animate-pulse"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {r.customer.company || r.customer.email}
                    {r.customer.name && (
                      <span className="text-gray-400 font-normal ml-1.5">
                        ({r.customer.name})
                      </span>
                    )}
                  </p>
                  {r.subject && (
                    <p className="text-xs text-gray-500 truncate">{r.subject}</p>
                  )}
                </div>
              </div>
              <span className="text-gray-400 ml-4 flex-shrink-0 text-xs">
                {expandedIdx === idx ? "▲" : "▼"}
              </span>
            </button>

            {expandedIdx === idx && r.status === "done" && (
              <div className="border-t px-5 py-4">
                <div className="flex justify-between items-start mb-3 gap-3">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">Subject: </span>
                    {r.subject}
                  </p>
                  <button
                    onClick={() => copyEmail(r, idx)}
                    className="flex-shrink-0 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {copiedIdx === idx ? "已复制 ✓" : "复制"}
                  </button>
                </div>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {r.body}
                </pre>
              </div>
            )}

            {expandedIdx === idx && r.status === "error" && (
              <div className="border-t px-5 py-4">
                <p className="text-sm text-red-500">生成失败，请重新上传后重试</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
