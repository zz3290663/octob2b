"use client";

import Link from "next/link";

export default function UpgradeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <h2 className="text-xl font-bold text-gray-900">次数已用完</h2>
        <p className="mt-2 text-sm text-gray-600">
          使用兑换码充值次数，继续使用所有 AI 功能。
        </p>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
            <div>
              <p className="font-medium text-gray-900">购买兑换码</p>
              <p className="text-sm text-gray-500">加微信</p>
            </div>
            <p className="text-sm text-gray-500">按需购买</p>
          </div>
        </div>

        <Link
          href="/redeem"
          onClick={onClose}
          className="mt-6 block w-full py-3 bg-blue-600 text-white text-center rounded-xl font-medium hover:bg-blue-700"
        >
          输入兑换码
        </Link>

        <button onClick={onClose} className="mt-3 w-full py-2 text-sm text-gray-400 hover:text-gray-600">
          稍后再说
        </button>
      </div>
    </div>
  );
}
