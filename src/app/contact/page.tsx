export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-gray-900">联系我们</h1>
      <p className="mt-3 text-gray-600">
        扫码付款，会员权益即刻开通
      </p>

      <div className="mt-10 grid grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl p-6 border">
          <div className="w-48 h-48 mx-auto bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">
            {/* 替换成你的微信收款码图片 */}
            微信收款码
          </div>
          <h3 className="mt-4 font-semibold text-gray-900">微信支付</h3>
          <p className="mt-1 text-sm text-gray-500">扫码 → 转账 → 联系客服开通</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border">
          <div className="w-48 h-48 mx-auto bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">
            {/* 替换成你的支付宝收款码图片 */}
            支付宝收款码
          </div>
          <h3 className="mt-4 font-semibold text-gray-900">支付宝</h3>
          <p className="mt-1 text-sm text-gray-500">扫码 → 转账 → 联系客服开通</p>
        </div>
      </div>

      <div className="mt-10 p-6 bg-blue-50 rounded-xl text-sm text-blue-800">
        <p className="font-medium">💡 开通流程</p>
        <ol className="mt-3 text-left space-y-1.5 max-w-sm mx-auto">
          <li>1️⃣ 扫码付款（月卡 ¥99 / 年卡 ¥599）</li>
          <li>2️⃣ 截图发到客服微信或邮箱</li>
          <li>3️⃣ 24小时内开通高级权限</li>
        </ol>
      </div>

      <div className="mt-8 text-sm text-gray-500">
        <p>付款后联系客服：contact@octob2b.com</p>
      </div>
    </main>
  );
}