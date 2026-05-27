import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data } = await supabase
    .from("my_templates")
    .select("id, name, subject, body, scenario, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { name, subject, body, scenario } = await req.json();
  if (!name?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "名称和正文不能为空" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("my_templates")
    .insert({ user_id: user.id, name: name.trim(), subject, body, scenario })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
