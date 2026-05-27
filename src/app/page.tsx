import Link from "next/link";

const SAMPLE_EMAIL = `Subject: Cutting Panel Costs Without Cutting Corners — For [Company]

Hi [Name],

Solar installers across Germany are absorbing 15–20% higher material costs this year — we've heard this from dozens of procurement teams. It doesn't have to stay that way.

We manufacture monocrystalline solar panels with TÜV and CE certification, currently supplying mid-size EPC firms in the DACH region. Our 410W–550W panels ship from our own factory with a 25-year performance warranty — no middlemen, no surprises.

Would a quick Zoom this week make sense? I can walk you through our current pricing and send samples within 3 days.

Best,
[Your Name]`;

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="py-20 text-center">
        <div className="inline-block mb-4 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">
          专为外贸业务员打造
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          从客户分析到邮件发送<br className="hidden md:block" />
          <span className="text-blue-600">全流程 AI 自动化</span>
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          10 秒洞察客户底细，AI 生成母语级开发信，一键批量群发——外贸业务员的全套 AI 助手。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/tools/cold-email"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-xl text-base font-medium hover:bg-blue-700"
          >
            免费开始使用
          </Link>
          <Link
            href="/tools/client-radar"
            className="inline-block bg-white border border-gray-200 text-gray-700 px-8 py-4 rounded-xl text-base font-medium hover:bg-gray-50"
          >
            先分析一个客户 →
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-400">无需注册 · 每天免费使用 3 次</p>
      </section>

      {/* ── 3 大工具 ─────────────────────────────────────────────────────── */}
      <section className="py-12">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">三大核心工具</h2>
        <p className="text-center text-gray-500 text-sm mb-10">覆盖外贸开发的完整工作流</p>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              icon: "🔍",
              title: "客户雷达",
              tag: "分析客户",
              desc: "输入客户网址，10 秒生成中文客户画像。了解对方主营业务、采购痛点、公司规模，出手前先知己知彼。",
              href: "/tools/client-radar",
              cta: "分析客户",
              color: "text-amber-600",
              tagBg: "bg-amber-50 text-amber-600",
            },
            {
              icon: "✉️",
              title: "开发信生成器",
              tag: "写邮件",
              desc: "填写产品信息，AI 生成母语级英文开发信。支持冷开发信、跟进信、报价跟进、询盘回复四种场景。",
              href: "/tools/cold-email",
              cta: "生成开发信",
              color: "text-blue-600",
              tagBg: "bg-blue-50 text-blue-600",
            },
            {
              icon: "📨",
              title: "批量群发",
              tag: "批量发送",
              desc: "上传客户名单 CSV，AI 为每位客户生成一封个性化邮件，用自己的邮箱一键批量发送，支持多种场景。",
              href: "/tools/bulk-email",
              cta: "批量生成",
              color: "text-purple-600",
              tagBg: "bg-purple-50 text-purple-600",
            },
          ].map((tool) => (
            <Link
              key={tool.title}
              href={tool.href}
              className="group bg-white rounded-2xl p-6 border hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">{tool.icon}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${tool.tagBg}`}>
                  {tool.tag}
                </span>
              </div>
              <h3 className={`text-lg font-bold mb-2 ${tool.color}`}>{tool.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{tool.desc}</p>
              <p className={`mt-4 text-sm font-medium ${tool.color} group-hover:underline`}>
                {tool.cta} →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 工作流程 ─────────────────────────────────────────────────────── */}
      <section className="py-12 border-t">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">三步完成一次完整开发</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "分析目标客户",
              desc: "用客户雷达输入对方网址，10 秒得到主营业务、采购痛点、开发建议，知道对方在乎什么。",
              icon: "🔍",
            },
            {
              step: "02",
              title: "AI 生成开发信",
              desc: "基于客户画像，填写你的产品信息，AI 生成一封专业、自然、针对性强的英文开发信。",
              icon: "✍️",
            },
            {
              step: "03",
              title: "批量发送给名单",
              desc: "有多个客户？上传 CSV 名单，AI 批量生成个性化邮件，用自己的邮箱按序发送，避免进垃圾箱。",
              icon: "🚀",
            },
          ].map((s, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center text-sm font-bold">
                {s.step}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {s.icon} {s.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 示例邮件 ─────────────────────────────────────────────────────── */}
      <section className="py-12 border-t">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">AI 生成的邮件长这样</h2>
          <p className="text-center text-sm text-gray-500 mb-8">母语级英文，针对性强，不像群发模板</p>
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="bg-gray-50 border-b px-5 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-xs text-gray-400 ml-2">示例邮件 — 太阳能板 → 德国工程商</span>
            </div>
            <div className="p-6">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {SAMPLE_EMAIL}
              </pre>
            </div>
            <div className="border-t px-6 py-4 bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-400">✅ 母语级英文 &nbsp;·&nbsp; ✅ 直切痛点 &nbsp;·&nbsp; ✅ 明确 CTA</p>
              <Link
                href="/tools/cold-email"
                className="text-sm text-blue-600 font-medium hover:underline"
              >
                生成我的开发信 →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 底部 CTA ─────────────────────────────────────────────────────── */}
      <section className="py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">立即免费体验</h2>
        <p className="text-gray-500 mb-8 text-sm">每天免费 3 次 · 无需信用卡 · 注册即用</p>
        <Link
          href="/register"
          className="inline-block bg-blue-600 text-white px-10 py-4 rounded-xl text-base font-medium hover:bg-blue-700"
        >
          免费注册
        </Link>
        <p className="mt-3 text-sm text-gray-400">
          已有账号？
          <Link href="/login" className="text-blue-600 hover:underline ml-1">
            直接登录
          </Link>
        </p>
      </section>

      {/* 价格 - 暂时隐藏，内部测试阶段 */}
      {/* <section id="pricing"> ... </section> */}

    </main>
  );
}
