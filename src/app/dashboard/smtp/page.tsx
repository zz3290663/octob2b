"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SMTP_PRESETS: Record<string, { host: string; port: number; secure_type: string }> = {
  Gmail: { host: "smtp.gmail.com", port: 465, secure_type: "SSL" },
  Outlook: { host: "smtp.office365.com", port: 587, secure_type: "STARTTLS" },
  "163邮箱": { host: "smtp.163.com", port: 465, secure_type: "SSL" },
  "QQ邮箱": { host: "smtp.qq.com", port: 465, secure_type: "SSL" },
  "企业微信邮箱": { host: "smtp.exmail.qq.com", port: 465, secure_type: "SSL" },
};

export default function SmtpConfigPage() {
  const [form, setForm] = useState({
    sender_name: "",
    sender_email: "",
    smtp_host: "",
    smtp_port: "465",
    smtp_username: "",
    smtp_password: "",
    secure_type: "SSL",
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      fetch("/api/smtp/config").then(r => r.json()).then(({ config }) => {
        if (config) {
          setForm(f => ({
            ...f,
            sender_name: config.sender_name,
            sender_email: config.sender_email,
            smtp_host: config.smtp_host,
            smtp_port: String(config.smtp_port),
            smtp_username: config.smtp_username,
            secure_type: config.secure_type,
          }));
          setIsVerified(config.is_verified);
        }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const applyPreset = (name: string) => {
    const p = SMTP_PRESETS[name];
    if (p) setForm(f => ({ ...f, smtp_host: p.host, smtp_port: String(p.port), secure_type: p.secure_type }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/smtp/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      setMsg({ type: "success", text: "配置已保存" });
      setIsVerified(false);
    } else {
      setMsg({ type: "error", text: data.error || "保存失败" });
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setMsg(null);
    const res = await fetch("/api/smtp/test", { method: "POST" });
    const data = await res.json();
    if (data.success) {
      setMsg({ type: "success", text: "测试邮件已发送到你的注册邮箱，SMTP 配置验证成功 ✅" });
      setIsVerified(true);
    } else {
      setMsg({ type: "error", text: data.error || "连接失败" });
    }
    setTesting(false);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">← 返回会员中心</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">邮箱配置</h1>
        <p className="text-sm text-gray-500 mt-1">配置你自己的邮箱，批量邮件将从该邮箱发出</p>
      </div>

      {/* 快速选择邮件服务商 */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <p className="text-sm font-medium text-gray-700 mb-3">快速套用配置</p>
        <div className="flex flex-wrap gap-2">
          {Object.keys(SMTP_PRESETS).map(name => (
            <button
              key={name}
              onClick={() => applyPreset(name)}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 text-gray-700"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* 配置表单 */}
      <div className="bg-white rounded-xl border p-6 mb-6 space-y-4">
        {isVerified && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <span>✅</span><span>当前配置已验证通过</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">发件人名称</label>
            <input
              value={form.sender_name}
              onChange={e => set("sender_name", e.target.value)}
              placeholder="你的姓名或公司名"
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">发件人邮箱</label>
            <input
              type="email"
              value={form.sender_email}
              onChange={e => set("sender_email", e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP 服务器</label>
            <input
              value={form.smtp_host}
              onChange={e => set("smtp_host", e.target.value)}
              placeholder="smtp.gmail.com"
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">端口</label>
            <input
              value={form.smtp_port}
              onChange={e => set("smtp_port", e.target.value)}
              placeholder="465"
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">加密方式</label>
          <div className="flex gap-3">
            {["SSL", "TLS", "STARTTLS"].map(t => (
              <label key={t} className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer text-sm ${form.secure_type === t ? "border-blue-500 bg-blue-50 text-blue-700" : "text-gray-600"}`}>
                <input type="radio" name="secure_type" value={t} checked={form.secure_type === t} onChange={e => set("secure_type", e.target.value)} className="hidden" />
                {t}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SMTP 用户名</label>
          <input
            value={form.smtp_username}
            onChange={e => set("smtp_username", e.target.value)}
            placeholder="通常是你的邮箱地址"
            className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            密码 / 授权码
            <span className="text-gray-400 font-normal ml-1">（加密保存，不明文存储）</span>
          </label>
          <input
            type="password"
            value={form.smtp_password}
            onChange={e => set("smtp_password", e.target.value)}
            placeholder="Gmail 请使用「应用专用密码」"
            className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${msg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存配置"}
        </button>
        <button
          onClick={handleTest}
          disabled={testing}
          className="flex-1 py-3 bg-white border rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {testing ? "测试中..." : "发送测试邮件"}
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">
        测试邮件会发送到你的账号注册邮箱，验证通过后才能正式发送
      </p>
    </main>
  );
}
