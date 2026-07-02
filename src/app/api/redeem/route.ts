import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { code } = await req.json();
  if (!code?.trim()) return NextResponse.json({ error: "请输入兑换码" }, { status: 400 });

  const normalized = code.trim().toUpperCase();

  const { data: record, error } = await supabase
    .from("redemption_codes")
    .select("*")
    .eq("code", normalized)
    .eq("product", "octob2b")
    .single();

  if (error || !record) return NextResponse.json({ error: "兑换码不存在或不适用于此平台" }, { status: 404 });
  if (record.is_used) return NextResponse.json({ error: "该兑换码已被使用" }, { status: 400 });

  await supabase.from("redemption_codes").update({
    is_used: true,
    used_by: user.id,
    used_at: new Date().toISOString(),
  }).eq("id", record.id);

  const { data: profile } = await supabase
    .from("profile")
    .select("credits")
    .eq("id", user.id)
    .single();

  const newBalance = (profile?.credits ?? 0) + record.credits;
  await supabase.from("profile").upsert({ id: user.id, credits: newBalance }, { onConflict: "id" });

  return NextResponse.json({ credits: record.credits, balance: newBalance });
}
