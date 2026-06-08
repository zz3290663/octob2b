"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const GUIDES: { name: string; steps: string[]; note?: string }[] = [
  {
    name: "Gmail（谷歌邮箱）",
    steps: [
      "登录 Gmail，右上角头像 → 管理 Google 账号",
      "顶部菜单点「安全性」",
      "找到「两步验证」，先开启（必须开启才能用应用密码）",
      "回到「安全性」页面，找到「应用密码」并点击",
      "选择应用「邮件」、设备「其他」，随便填个名字如「octob2b」",
      "点「生成」，复制显示的 16 位密码（只显示一次）",
      "回到这里，密码/授权码 填这个 16 位密码，不是你的 Gmail 登录密码",
    ],
    note: "⚠️ 需要先开启两步验证，才能生成应用密码",
  },
  {
    name: "QQ邮箱",
    steps: [
      "登录 QQ 邮箱（mail.qq.com）",
      "点右上角「设置」→「账户」",
      "往下滚，找到「POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务」",
      "开启「IMAP/SMTP服务」，按提示发送短信验证",
      "验证后会显示一串授权码，复制保存",
      "回到这里，密码/授权码 填这串授权码，不是 QQ 密码",
    ],
    note: "⚠️ 密码填授权码，不是 QQ 登录密码",
  },
  {
    name: "126邮箱",
    steps: [
      "用浏览器打开 mail.126.com，用账号密码登录",
      "点击顶部导航「设置」→「POP3/SMTP/IMAP」",
      "找到「SMTP服务」一行，点击「开启」",
      "系统会要求手机验证（扫码或发短信），完成验证",
      "验证成功后页面会弹出「授权密码」，这是一串随机字母，立刻复制保存（页面关闭后不再显示）",
      "回到这里：SMTP服务器填 smtp.126.com，端口 465，SSL加密",
      "用户名填完整邮箱地址（如 abc@126.com），密码填刚才复制的授权密码",
    ],
    note: "⚠️ 必须填「授权密码」，不能填邮箱登录密码，否则报 535 错误",
  },
  {
    name: "163邮箱",
    steps: [
      "登录 163 邮箱（mail.163.com）",
      "点顶部「设置」→「POP3/SMTP/IMAP」",
      "开启「SMTP服务」",
      "按提示用手机扫码或发短信验证",
      "验证后会生成授权密码，复制保存",
      "回到这里，密码/授权码 填这个授权密码",
    ],
    note: "⚠️ 密码填授权密码，不是 163 登录密码",
  },
  {
    name: "企业邮箱（腾讯企业邮）",
    steps: [
      "登录企业邮箱后台（exmail.qq.com）",
      "点右上角头像 → 账号与安全",
      "找到「安全登录」→「客户端专用密码」",
      "生成一个专用密码并复制",
      "回到这里，SMTP 用户名填你的企业邮箱地址，密码填专用密码",
    ],
  },
  {
    name: "Hostinger 企业邮箱",
    steps: [
      "登录 Hostinger 后台（hpanel.hostinger.com）",
      "左侧菜单点「Emails」→「Email Accounts」",
      "找到你的邮箱账号，点「Manage」",
      "页面里可以看到 SMTP 配置信息，一般如下：",
      "SMTP 服务器：smtp.hostinger.com",
      "端口：465（SSL）或 587（STARTTLS）",
      "用户名：你的完整邮箱地址，如 you@yourcompany.com",
      "密码：你在 Hostinger 创建该邮箱时设置的密码（就是邮箱登录密码，不需要额外生成授权码）",
    ],
    note: "💡 如果忘记密码，在 Hostinger 后台 Email Accounts 页面可以直接重置",
  },
  {
    name: "Outlook / 微软邮箱",
    steps: [
      "登录 Outlook（outlook.com）",
      "点右上角齿轮图标 → 查看所有 Outlook 设置",
      "点「邮件」→「同步电子邮件」",
      "确认 POP 和 IMAP 已启用",
      "Outlook 直接用账号密码即可，填登录邮箱和密码就行",
    ],
    note: "如果用公司 365 账号，可能需要管理员开放 SMTP 权限",
  },
];

const SMTP_PRESETS: Record<string, { host: string; port: number; secure_type: string }> = {
  Gmail: { host: "smtp.gmail.com", port: 465, secure_type: "SSL" },
  Outlook: { host: "smtp.office365.com", port: 587, secure_type: "STARTTLS" },
  "163邮箱": { host: "smtp.163.com", port: 465, secure_type: "SSL" },
  "126邮箱": { host: "smtp.126.com", port: 465, secure_type: "SSL" },
  "QQ邮箱": { host: "smtp.qq.com", port: 465, secure_type: "SSL" },
  "企业微信邮箱": { host: "smtp.exmail.qq.com", port: 465, secure_type: "SSL" },
  "Hostinger": { host: "smtp.hostinger.com", port: 465, secure_type: "SSL" },
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
    signature: "",
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [openGuide, setOpenGuide] = useState<string | null>(null);
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
            signature: config.signature || "",
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            邮件签名
            <span className="text-gray-400 font-normal ml-1">（可选，自动附在每封邮件末尾）</span>
          </label>

          {/* 预设模板 */}
          <div className="flex flex-wrap gap-2 mb-2">
            {[
              {
                label: "简洁版",
                template: (name: string, email: string) =>
                  `Best regards,\n${name || "Your Name"}\n[Title] | [Company]\nTel: +86-xxx-xxxx-xxxx\n${email || "your@email.com"}`,
              },
              {
                label: "标准外贸版",
                template: (name: string, email: string) =>
                  `Best regards,\n${name || "Your Name"}\nExport Sales Manager\n[Company Name] | China\nTel/WhatsApp: +86-xxx-xxxx-xxxx\n${email || "your@email.com"}\nwww.[yourcompany].com`,
              },
              {
                label: "中英双语版",
                template: (name: string, email: string) =>
                  `Best regards / 顺颂商祺,\n${name || "Your Name"} / [中文姓名]\n[Title / 职位] | [Company / 公司]\nTel/WhatsApp: +86-xxx-xxxx-xxxx\n${email || "your@email.com"}\nwww.[yourcompany].com`,
              },
              {
                label: "详细版",
                template: (name: string, email: string) =>
                  `Best regards,\n${name || "Your Name"}\n[Title]\n\n[Company Name]\nAdd: [Address, City, China]\nTel: +86-xxx-xxxx-xxxx\nWhatsApp: +86-xxx-xxxx-xxxx\nSkype: [skype_id]\n${email || "your@email.com"}\nwww.[yourcompany].com`,
              },
            ].map(({ label, template }) => (
              <button
                key={label}
                type="button"
                onClick={() => set("signature", template(form.sender_name, form.sender_email))}
                className="px-3 py-1 text-xs border rounded-lg text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>

          <textarea
            value={form.signature}
            onChange={e => set("signature", e.target.value)}
            placeholder={`点上方模板快速填入，或直接输入...\n\nBest regards,\n张伟 (Wei Zhang)\nExport Sales Manager | ABC Trading Co., Ltd.\nTel: +86-138-xxxx-xxxx\nyour@email.com`}
            rows={6}
            className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y font-mono"
          />
          <p className="text-xs text-gray-400 mt-1">
            点模板快速填入后，把 [ ] 里的内容替换成你自己的信息 · 发送时自动附在正文末尾
          </p>
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

      {/* 配置说明 */}
      <div className="mt-10">
        <h2 className="text-base font-semibold text-gray-800 mb-3">📖 各邮箱配置教程</h2>
        <div className="space-y-2">
          {GUIDES.map((guide) => (
            <div key={guide.name} className="bg-white border rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setOpenGuide(openGuide === guide.name ? null : guide.name)}
              >
                <span className="text-sm font-medium text-gray-800">{guide.name}</span>
                <span className="text-gray-400 text-xs">{openGuide === guide.name ? "▲ 收起" : "▼ 查看步骤"}</span>
              </button>

              {openGuide === guide.name && (
                <div className="border-t px-5 py-4">
                  {guide.note && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                      {guide.note}
                    </div>
                  )}
                  <ol className="space-y-2">
                    {guide.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-gray-700">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <button
                    onClick={() => applyPreset(guide.name.split("（")[0].replace("企业邮箱", "企业微信邮箱"))}
                    className="mt-4 text-xs text-blue-600 hover:underline"
                  >
                    套用此邮箱的 SMTP 配置 →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
