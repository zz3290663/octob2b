import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import AuthListener from "@/components/AuthListener";

export const metadata: Metadata = {
  title: "octob2b - 外贸开发信生成器",
  description: "输入产品信息，一键生成专业外贸开发信。免费每天3次，会员无限用。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-gray-50">
        <AuthListener />
        <Header />
        {children}
        <footer className="border-t py-8 text-center text-sm text-gray-500">
          <p>© 2026 octob2b.com · 外贸B2B工具站</p>
          <p className="mt-2">
            <a href="/privacy" className="hover:underline">隐私政策</a>
            {" · "}
            <a href="/terms" className="hover:underline">服务条款</a>
          </p>
        </footer>
      </body>
    </html>
  );
}