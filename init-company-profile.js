#!/usr/bin/env node
/**
 * 初始化 company_profile 表
 * 运行: node init-company-profile.js
 * 需要: .env.local 中的 SUPABASE_SERVICE_ROLE_KEY
 */

require("dotenv").config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY || !SUPABASE_URL) {
  console.error("❌ 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
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
  console.log("🔧 初始化 company_profile 表...\n");

  await sql(`
    CREATE TABLE IF NOT EXISTS public.company_profile (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      company_name_en TEXT NOT NULL DEFAULT '',
      company_name_cn TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      payment_terms TEXT NOT NULL DEFAULT 'T/T 30% deposit, 70% before shipment',
      delivery_days INTEGER NOT NULL DEFAULT 30,
      validity_days INTEGER NOT NULL DEFAULT 30,
      bank_info TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id)
    );
  `);
  console.log("✅ company_profile 表创建完成");

  await sql(`ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;`);

  await sql(`
    DROP POLICY IF EXISTS "Users can view own company_profile" ON public.company_profile;
    CREATE POLICY "Users can view own company_profile"
      ON public.company_profile FOR SELECT
      USING (auth.uid() = user_id);
  `);
  await sql(`
    DROP POLICY IF EXISTS "Users can insert own company_profile" ON public.company_profile;
    CREATE POLICY "Users can insert own company_profile"
      ON public.company_profile FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  `);
  await sql(`
    DROP POLICY IF EXISTS "Users can update own company_profile" ON public.company_profile;
    CREATE POLICY "Users can update own company_profile"
      ON public.company_profile FOR UPDATE
      USING (auth.uid() = user_id);
  `);
  console.log("✅ RLS 策略配置完成");

  await sql(`
    DROP TRIGGER IF EXISTS update_company_profile_updated_at ON public.company_profile;
    CREATE TRIGGER update_company_profile_updated_at
      BEFORE UPDATE ON public.company_profile
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  `);
  console.log("✅ 触发器创建完成");

  await sql(`GRANT ALL ON public.company_profile TO anon;`);
  console.log("✅ 权限授予完成");

  console.log("\n✅ 初始化完成！");
}

main().catch(err => {
  if (err.message.includes("already exists")) {
    console.log("✅ 表已存在，跳过");
  } else {
    console.error("❌ 错误:", err.message);
    process.exit(1);
  }
});
