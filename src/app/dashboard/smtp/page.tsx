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

interface SmtpConfigItem {
  id: string;
  label: string;
  sender_name: string;
  sender_email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  secure_type: string;
  is_verified: boolean;
  signature: string | null;
}

const EMPTY_FORM = {
  label: "",
  sender_name: "",
  sender_email: "",
  smtp_host: "",
  smtp_port: "465",
  smtp_username: "",
  smtp_password: "",
  secure_type: "SSL",
  signature: "",
};

export default function SmtpConfigPage() {
  const [configs, setConfigs] = useState<SmtpConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [openGuide, setOpenGuide] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const loadConfigs = async () => {
    const res = await fetch("/api/smtp/config");
    const data = await res.json();
    setConfigs(data.configs ?? []);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      loadConfigs();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const applyPreset = (name: string) => {
    const p = SMTP_PRESETS[name];
    if (p) setForm(f => ({ ...f, smtp_host: p.host, smtp_port: String(p.port), secure_type: p.secure_type }));
  };

  const openNew = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setMsg(null);
    setView("form");
  };

  const openEdit = (c: SmtpConfigItem) => {
    setForm({
      label: c.label || "",
      sender_name: c.sender_name,
      sender_email: c.sender_email,
      smtp_host: c.smtp_host,
      smtp_port: String(c.smtp_port),
      smtp_username: c.smtp_username,
      smtp_password: "", // 留空表示不修改
      secure_type: c.secure_type,
      signature: c.signature || "",
    });
    setEditingId(c.id);
    setMsg(null);
    setView("form");
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/smtp/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, id: editingId }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      await loadConfigs();
      setView("list");
      setMsg({ type: "success", text: "已保存，记得点「测试」验证后才能用来群发" });
    } else {
      setMsg({ type: "error", text: data.error || "保存失败" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这个发信邮箱吗？")) return;
    await fetch(`/api/smtp/config?id=${id}`, { method: "DELETE" });
    loadConfigs();
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    setMsg(null);
    const res = await fetch("/api/smtp/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ configId: id }),
    });
    const data = await res.json();
    setTestingId(null);
    if (data.success) {
      setMsg({ type: "success", text: "测试邮件已发送到你的注册邮箱，验证成功 ✅" });
      loadConfigs();
    } else {
      setMsg({ type: "error", text: data.error || "连接失败" });
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">← 返回会员中心</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">邮箱配置</h1>
        <p className="text-sm text-gray-500 mt-1">可添加多个发信邮箱，群发时选择用哪个发出</p>
      </div>

      {/* 防封指南 */}
      <details className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6 group">
        <summary className="cursor-pointer list-none flex items-center justify-between">
          <span className="text-sm font-semibold text-blue-900">🛡️ 怕主邮箱被封？用「专用发信邮箱」（强烈建议）</span>
          <span className="text-blue-400 text-xs group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="mt-4 text-sm text-blue-900/90 space-y-3 leading-relaxed">
          <p>
            群发开发信有被判垃圾邮件、甚至封号的风险。<span className="font-medium">最稳妥的做法不是用别人的邮箱代发，而是给开发信单独配一个「专用发信邮箱」，把风险和你的主邮箱隔离开：</span>
          </p>
          <ol className="space-y-2 list-decimal list-inside">
            <li>另注册一个<span className="font-medium">子域名或近似域名</span>（如 <code className="bg-white px-1 rounded">mail.yourcompany.com</code> 或 <code className="bg-white px-1 rounded">yourcompany-sales.com</code>），专门用来发开发信，不要用公司主邮箱。</li>
            <li>给这个域名配好 <span className="font-medium">SPF / DKIM / DMARC</span> 认证（在域名服务商后台按邮箱服务商的指引添加，能大幅提高送达率）。</li>
            <li>用这个专用邮箱的 SMTP 信息添加到下面即可。</li>
          </ol>
          <p className="bg-white/60 rounded-lg px-3 py-2">
            <span className="font-medium">好处：</span>就算这个专用域名被搞臭了，你的<span className="font-medium">主邮箱和主域名毫发无伤</span>；发件人仍是你自己的身份，可信度和送达率都高。再配合每天限量（新号先每天 10 封内、老号 20–30 封）就更安全。
          </p>
          <p className="text-xs text-blue-800/80">
            ⚠️ 注意：让第三方代发、或发件人与回复邮箱域名不一致，反而是垃圾邮件的典型特征，并不能真正防封，还可能降低送达率。
          </p>
        </div>
      </details>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${msg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* ── 邮箱列表 ── */}
      {view === "list" && (
        <>
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-400">加载中...</div>
          ) : configs.length === 0 ? (
            <div className="bg-white rounded-xl border p-10 text-center">
              <p className="text-gray-500 text-sm">还没有配置发信邮箱</p>
              <button onClick={openNew} className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                ＋ 添加发信邮箱
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {configs.map(c => (
                <div key={c.id} className="bg-white rounded-xl border p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{c.label}</p>
                        {c.is_verified ? (
                          <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">✅ 已验证</span>
                        ) : (
                          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">⚠️ 未验证</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">{c.sender_name} &lt;{c.sender_email}&gt;</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{c.smtp_host}:{c.smtp_port} · {c.secure_type}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleTest(c.id)} disabled={testingId === c.id}
                        className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 disabled:opacity-50">
                        {testingId === c.id ? "测试中..." : "测试"}
                      </button>
                      <button onClick={() => openEdit(c)} className="text-xs px-3 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-50">编辑</button>
                      <button onClick={() => handleDelete(c.id)} className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50">删除</button>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={openNew} className="w-full py-3 border-2 border-dashed rounded-xl text-sm font-medium text-gray-500 hover:border-blue-300 hover:text-blue-600">
                ＋ 再添加一个发信邮箱
              </button>
            </div>
          )}
        </>
      )}

      {/* ── 新增 / 编辑表单 ── */}
      {view === "form" && (
        <>
          <button onClick={() => { setView("list"); setMsg(null); }} className="text-sm text-gray-400 hover:text-gray-600 mb-4">← 返回邮箱列表</button>

          {/* 快速套用配置 */}
          <div className="bg-white rounded-xl border p-6 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">快速套用配置</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(SMTP_PRESETS).map(name => (
                <button key={name} onClick={() => applyPreset(name)}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 text-gray-700">
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* 配置表单 */}
          <div className="bg-white rounded-xl border p-6 mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱备注名 <span className="text-gray-400 font-normal">（方便识别，如「主邮箱」「开发信小号」）</span></label>
              <input value={form.label} onChange={e => set("label", e.target.value)} placeholder="开发信小号"
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">发件人名称</label>
                <input value={form.sender_name} onChange={e => set("sender_name", e.target.value)} placeholder="你的姓名或公司名"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">发件人邮箱</label>
                <input type="email" value={form.sender_email} onChange={e => set("sender_email", e.target.value)} placeholder="your@email.com"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP 服务器</label>
                <input value={form.smtp_host} onChange={e => set("smtp_host", e.target.value)} placeholder="smtp.gmail.com"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">端口</label>
                <input value={form.smtp_port} onChange={e => set("smtp_port", e.target.value)} placeholder="465"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
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
              <input value={form.smtp_username} onChange={e => set("smtp_username", e.target.value)} placeholder="通常是你的邮箱地址"
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                密码 / 授权码
                <span className="text-gray-400 font-normal ml-1">
                  {editingId ? "（留空表示不修改）" : "（加密保存，不明文存储）"}
                </span>
              </label>
              <input type="password" value={form.smtp_password} onChange={e => set("smtp_password", e.target.value)}
                placeholder={editingId ? "不改就留空" : "Gmail 请使用「应用专用密码」"}
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邮件签名
                <span className="text-gray-400 font-normal ml-1">（可选，自动附在每封邮件末尾）</span>
              </label>

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
                  <button key={label} type="button"
                    onClick={() => set("signature", template(form.sender_name, form.sender_email))}
                    className="px-3 py-1 text-xs border rounded-lg text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors">
                    {label}
                  </button>
                ))}
              </div>

              <textarea value={form.signature} onChange={e => set("signature", e.target.value)}
                placeholder={`点上方模板快速填入，或直接输入...\n\nBest regards,\n张伟 (Wei Zhang)\nExport Sales Manager | ABC Trading Co., Ltd.\nTel: +86-138-xxxx-xxxx\nyour@email.com`}
                rows={6}
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y font-mono" />
              <p className="text-xs text-gray-400 mt-1">
                点模板快速填入后，把 [ ] 里的内容替换成你自己的信息 · 发送时自动附在正文末尾
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setView("list"); setMsg(null); }}
              className="flex-1 py-3 bg-white border rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              取消
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? "保存中..." : "保存邮箱"}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-3">
            保存后回列表点「测试」验证，通过后才能用来群发
          </p>
        </>
      )}

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
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
