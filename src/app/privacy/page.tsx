export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900">隐私政策</h1>
      <p className="text-sm text-gray-500 mt-2">最后更新：2026年5月</p>

      <div className="mt-8 space-y-6 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">信息收集</h2>
          <p className="mt-2">我们收集以下信息：</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>账户信息：</strong>邮箱地址（用于登录和发送通知）</li>
            <li><strong>使用记录：</strong>您使用工具的时间、产品类型、市场等（用于统计和限额控制）</li>
            <li><strong>IP地址：</strong>用于防止滥用和安全审计</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">信息使用</h2>
          <p className="mt-2">我们使用收集的信息用于：</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>提供AI开发信生成服务</li>
            <li>统计使用量，执行每日免费额度限制</li>
            <li>发送账户相关通知（如登录验证链接）</li>
            <li>改进服务质量</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">信息保护</h2>
          <p className="mt-2">
            我们使用Supabase作为后端数据库服务，采用行业标准的安全措施保护您的数据。
            您的密码和敏感信息经过加密处理。我们不会将您的个人信息出售给第三方。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">Cookies</h2>
          <p className="mt-2">
            我们使用必要的Cookies来维护您的登录状态。不使用追踪或广告Cookies。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">第三方服务</h2>
          <p className="mt-2">
            我们使用以下第三方服务：Supabase（数据库）、Resend（邮件发送）、DeepSeek（AI生成）。
            这些服务有自己的隐私政策，我们已要求其提供适当的数据保护。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">您的权利</h2>
          <p className="mt-2">
            您可以联系我们（contact@octob2b.com）要求删除您的账户和所有相关数据。
            我们将在30天内响应您的请求。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">联系</h2>
          <p className="mt-2">
            如有隐私相关问题，请联系：contact@octob2b.com
          </p>
        </section>
      </div>
    </main>
  );
}