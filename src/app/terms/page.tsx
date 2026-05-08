export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900">服务条款</h1>
      <p className="text-sm text-gray-500 mt-2">最后更新：2026年5月</p>

      <div className="mt-8 space-y-6 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">服务说明</h2>
          <p className="mt-2">
            octob2b 提供AI开发信生成服务。用户输入产品和市场信息，系统生成英文开发信草稿。
            生成的内容仅作为参考，使用者需自行承担合规责任。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">使用限制</h2>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>免费用户：每天最多生成3封开发信</li>
            <li>会员：无次数限制，有效期内有效</li>
            <li>禁止使用本服务生成违法、侵权或歧视性内容</li>
            <li>禁止批量自动化请求以绕过限额</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">内容合规</h2>
          <p className="mt-2">
            <strong>AI生成内容仅供参考。</strong>我们已内置违禁词过滤，但无法覆盖所有情况。
            使用者应自行审查生成内容，确保符合：
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>目标国家的法律法规</li>
            <li>对方企业的采购政策</li>
            <li>出口管制和制裁规定（如涉及伊朗、朝鲜等受制裁国家的内容将被拒绝）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">付费与退款</h2>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>月卡会员：¥99/月，年卡会员：¥599/年</li>
            <li>支付方式：微信/支付宝人工收款</li>
            <li>付款后24小时内开通会员权限</li>
            <li>虚拟商品一经开通不支持退款</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">免责声明</h2>
          <p className="mt-2">
            AI生成的内容可能存在误差或不当之处。octob2b不对生成内容的准确性、
            完整性或适用性作出任何保证。使用者因使用本服务产生的任何后果自负。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">服务变更</h2>
          <p className="mt-2">
            我们保留随时修改功能、定价的权利。重大变更将提前7天通知。
            免费额度和服务条款的最终解释权归 octob2b 所有。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">联系</h2>
          <p className="mt-2">
            如有疑问，请联系：contact@octob2b.com
          </p>
        </section>
      </div>
    </main>
  );
}