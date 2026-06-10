"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Header() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null)
    );
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
          <Link href="/#pricing" className="text-sm text-gray-600 hover:text-blue-600">
            价格
          </Link>
          <Link href="/contact" className="text-sm text-gray-600 hover:text-blue-600">
            联系我们
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-blue-600"
              >
                会员中心
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
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