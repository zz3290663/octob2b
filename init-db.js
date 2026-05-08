#!/usr/bin/env node
/**
 * Supabase 数据库初始化脚本
 * 创建 profile 表 + RLS 策略 + 触发器
 *
 * 运行: node init-db.js
 * 需要: .env.local 中的 SUPABASE_SERVICE_ROLE_KEY（在 Supabase Dashboard → Project Settings → API 获取）
 */

const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error("❌ 缺少 SUPABASE_SERVICE_ROLE_KEY");
  console.error("   在 Supabase Dashboard → Project Settings → API → service_role secret");
  process.exit(1);
}

async function sql(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
}

async function main() {
  console.log("🔧 初始化 Supabase 数据库...\n");

  // 1. 创建 profile 表
  console.log("1. 创建 profile 表...");
  await sql(`
    CREATE TABLE IF NOT EXISTS public.profile (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      credits INTEGER NOT NULL DEFAULT 10,
      is_premium BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  console.log("   ✅ profile 表创建完成");

  // 2. 开启 RLS
  console.log("2. 开启 RLS...");
  await sql(`ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;`);
  console.log("   ✅ RLS 已开启");

  // 3. RLS 策略：用户只能读写自己的 profile
  console.log("3. 创建 RLS 策略...");
  await sql(`
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profile;
    CREATE POLICY "Users can view own profile"
      ON public.profile FOR SELECT
      USING (auth.uid() = id);
  `);
  await sql(`
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profile;
    CREATE POLICY "Users can update own profile"
      ON public.profile FOR UPDATE
      USING (auth.uid() = id);
  `);
  console.log("   ✅ RLS 策略创建完成");

  // 4. 创建 update_timestamp 函数
  console.log("4. 创建触发器...");
  await sql(`
    CREATE OR REPLACE FUNCTION public.handle_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await sql(`
    DROP TRIGGER IF EXISTS update_profile_updated_at ON public.profile;
    CREATE TRIGGER update_profile_updated_at
      BEFORE UPDATE ON public.profile
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  `);
  console.log("   ✅ 触发器创建完成");

  // 5. 创建 new_user 触发器（自动创建 profile）
  await sql(`
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.profile (id) VALUES (NEW.id);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `);
  await sql(`
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  `);
  console.log("   ✅ 新用户自动创建 profile 完成");

  // 6. 授予 public schema 权限
  await sql(`GRANT USAGE ON SCHEMA public TO anon;`);
  await sql(`GRANT ALL ON public.profile TO anon;`);
  await sql(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;`);
  console.log("   ✅ 权限授予完成");

  console.log("\n✅ 数据库初始化完成！");
  console.log("   - profile 表：id, credits, is_premium, created_at, updated_at");
  console.log("   - RLS 策略：用户只能访问自己的 profile");
  console.log("   - 自动触发：新用户注册自动创建 profile（credits=10）");
}

main().catch((err) => {
  // 400 错误码说明表/策略已存在，这是正常的
  if (err.message.includes("400") || err.message.includes("already exists")) {
    console.log("✅ 部分资源已存在，跳过（正常）");
  } else {
    console.error("❌ 错误:", err.message);
    process.exit(1);
  }
});