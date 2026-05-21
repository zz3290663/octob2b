import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4">
      {/* Hero */}
      <section className="py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          一键生成专业外贸开发信
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          输入产品信息，AI 自动生成符合英语母语习惯的开发信。
          支持冷开发信、跟进信、报价跟进、询盘回复四种类型。
        </p>
        <Link
          href="/tools/cold-email"
          className="inline-block bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-blue-700"
        >
          立即开始免费使用
        </Link>
        <p className="mt-4 text-sm text-gray-500">无需注册 · 每天免费生成3封</p>
      </section>

      {/* 功能 */}
      <section className="py-16 grid md:grid-cols-2 gap-6">
        {[
          {
            title: "冷开发信",
            desc: "首次联系目标客户，开场即吸引注意力",
            icon: "📧",
          },
          {
            title: "跟进信",
            desc: "对方未回复时，优雅地持续跟进",
            icon: "🔄",
          },
          {
            title: "报价跟进",
            desc: "发完报价后没回应？催单也能有温度",
            icon: "💰",
          },
          {
            title: "询盘回复",
            desc: "专业回复客户询盘，留下好印象",
            icon: "💬",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-white rounded-xl p-6 border hover:shadow-md transition"
          >
            <span className="text-3xl">{item.icon}</span>
            <h3 className="mt-3 font-semibold text-gray-900">{item.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{item.desc}</p>
          </div>
        ))}
      </section>

      {/* 价格 - 暂时隐藏，内部测试阶段 */}
      {/* <section id="pricing" className="py-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
          简单透明的定价
        </h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="bg-white rounded-xl p-8 border">
            <h3 className="text-lg font-semibold text-gray-900">免费用户</h3>
            <p className="text-3xl font-bold mt-4">¥0</p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>✅ 每天 3 次生成额度</li>
              <li>✅ 支持4种写信类型</li>
              <li>✅ 3种写作风格可选</li>
            </ul>
          </div>
          <div className="bg-blue-600 rounded-xl p-8 text-white">
            <h3 className="text-lg font-semibold">会员</h3>
            <p className="text-3xl font-bold mt-4">¥99<span className="text-base font-normal">/月</span></p>
            <p className="text-sm text-blue-100 mt-1">年卡 ¥599（约5折）</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>✅ 无限次使用</li>
              <li>✅ 会员专属功能</li>
              <li>✅ 优先客服支持</li>
            </ul>
            <button className="mt-6 w-full bg-white text-blue-600 py-2 rounded-lg font-medium hover:bg-blue-50">
              联系客服升级
            </button>
          </div>
        </div>
      </section> */}
    </main>
  );
}