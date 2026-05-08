"use client";

import Link from "next/link";

export default function UpgradeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <h2 className="text-xl font-bold text-gray-900">今日免费次数已用完</h2>
        <p className="mt-2 text-sm text-gray-600">
          开发信生成器还需要用？升级会员，无限次使用。
        </p>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">月卡会员</p>
              <p className="text-sm text-gray-500">无限次使用</p>
            </div>
            <p className="text-xl font-bold text-blue-600">¥99/月</p>
          </div>
          <div className="flex items-center justify-between p-4 bg-blue-600 rounded-xl text-white">
            <div>
              <p className="font-medium">年卡会员</p>
              <p className="text-sm text-blue-100">约5折，更划算</p>
            </div>
            <p className="text-xl font-bold">¥599/年</p>
          </div>
        </div>

        <Link
          href="/contact"
          onClick={onClose}
          className="mt-6 block w-full py-3 bg-blue-600 text-white text-center rounded-xl font-medium hover:bg-blue-700"
        >
          扫码升级
        </Link>

        <button
          onClick={onClose}
          className="mt-3 w-full py-2 text-sm text-gray-400 hover:text-gray-600"
        >
          稍后再说
        </button>
      </div>
    </div>
  );
}