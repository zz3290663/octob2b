"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const fetchCredits = async (userId: string) => {
    const { data } = await supabase.from("profile").select("credits").eq("id", userId).single();
    setCredits(data?.credits ?? 0);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) fetchCredits(data.user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchCredits(session.user.id);
      else setCredits(null);
    });
    return () => listener.subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="border-b bg-white">
      <nav className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">
          octob2b
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/tools/cold-email" className="text-sm text-gray-600 hover:text-blue-600">
            开发信
          </Link>
          <Link href="/tools/bulk-email" className="text-sm text-gray-600 hover:text-blue-600">
            批量群发
          </Link>
          <Link href="/tools/client-radar" className="text-sm text-gray-600 hover:text-blue-600">
            客户雷达
          </Link>
          <Link href="/tools/smart-email" className="text-sm text-gray-600 hover:text-blue-600">
            智能开发信
          </Link>
          <Link href="/tools/quote-generator" className="text-sm text-gray-600 hover:text-blue-600">
            报价单
          </Link>
          <Link href="https://img.octob2b.com" target="_blank" className="text-sm text-gray-600 hover:text-blue-600">
            图片处理
          </Link>
          <Link href="/redeem" className="text-sm text-gray-600 hover:text-blue-600">
            兑换次数
          </Link>
          <Link href="/contact" className="text-sm text-gray-600 hover:text-blue-600">
            联系我们
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-blue-600">
                会员中心
              </Link>
              <Link href="/redeem"
                className="flex items-center gap-1 text-sm bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100">
                <span className="font-semibold">{credits ?? "–"}</span>
                <span>次</span>
              </Link>
              <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-600">
                退出
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm text-gray-600 hover:text-blue-600"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                免费注册
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}