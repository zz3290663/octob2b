import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 获取 profile
  const { data: profile } = await supabase
    .from("profile")
    .select("credits, is_premium")
    .eq("id", user.id)
    .single();

  const credits = profile?.credits ?? 10;
  const isPremium = profile?.is_premium ?? false;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">会员中心</h1>
      <p className="mt-1 text-sm text-gray-500">{user.email}</p>

      {/* 状态卡片 */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 border">
          <p className="text-sm text-gray-500">我的身份</p>
          <p className="mt-2 text-2xl font-bold text-blue-600">
            {isPremium ? "VIP 会员" : "免费用户"}
          </p>
          {!isPremium && (
            <p className="mt-1 text-xs text-gray-400">每天3次免费额度</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 border">
          <p className="text-sm text-gray-500">剩余额度</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {isPremium ? "∞" : credits}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {isPremium ? "会员无限用" : "次/天"}
          </p>
        </div>
      </div>

      {/* 升级入口 - 暂时隐藏，内部测试阶段 */}
      {/* {!isPremium && (
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-white">
          <h3 className="font-semibold">升级会员，享受无限次</h3>
          <p className="mt-1 text-sm text-blue-100">
            月卡 ¥99/月 · 年卡 ¥599/年（约5折）
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-block bg-white text-blue-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-50"
          >
            扫码升级
          </Link>
        </div>
      )} */}

      {/* 快捷链接 */}
      <div className="mt-8 space-y-3">
        <Link
          href="/tools/cold-email"
          className="flex items-center justify-between p-4 bg-white rounded-xl border hover:shadow-sm transition"
        >
          <div>
            <p className="font-medium text-gray-900">开发信生成器</p>
            <p className="text-sm text-gray-500">AI 一键生成专业开发信</p>
          </div>
          <span className="text-gray-400">→</span>
        </Link>
      </div>
    </main>
  );
}