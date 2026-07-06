import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";
import { NextRequest, NextResponse } from "next/server";

// 返回用户的所有发信邮箱
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data } = await supabase
    .from("smtp_configs")
    .select("id, label, sender_name, sender_email, smtp_host, smtp_port, smtp_username, secure_type, is_verified, signature")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: true });

  return NextResponse.json({ configs: data ?? [] });
}

// 新增或更新一个发信邮箱：body 带 id 则更新，否则新增
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await req.json();
  const { id, label, sender_name, sender_email, smtp_host, smtp_port, smtp_username, smtp_password, secure_type, signature } = body;

  if (!sender_name || !sender_email || !smtp_host || !smtp_port || !smtp_username) {
    return NextResponse.json({ error: "请填写所有必填字段" }, { status: 400 });
  }

  const base = {
    label: label?.trim() || sender_email,
    sender_name,
    sender_email,
    smtp_host,
    smtp_port: Number(smtp_port),
    smtp_username,
    secure_type: secure_type || "SSL",
    signature: signature || null,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    // 更新已有邮箱。改了配置就要重新验证；密码留空表示不改
    const update: Record<string, unknown> = { ...base, is_verified: false };
    if (smtp_password) update.smtp_password_encrypted = encrypt(smtp_password);

    const { error } = await supabase
      .from("smtp_configs")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, id });
  }

  // 新增，密码必填
  if (!smtp_password) {
    return NextResponse.json({ error: "请填写密码 / 授权码" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("smtp_configs")
    .insert({
      ...base,
      user_id: user.id,
      smtp_password_encrypted: encrypt(smtp_password),
      is_verified: false,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}

// 删除一个发信邮箱
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  const { error } = await supabase
    .from("smtp_configs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
