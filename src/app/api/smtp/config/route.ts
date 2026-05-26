import { createClient } from "@/lib/supabase/server";
import { encrypt, decrypt } from "@/lib/encryption";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data } = await supabase
    .from("smtp_configs")
    .select("sender_name, sender_email, smtp_host, smtp_port, smtp_username, secure_type, is_verified")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({ config: data ?? null });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await req.json();
  const { sender_name, sender_email, smtp_host, smtp_port, smtp_username, smtp_password, secure_type } = body;

  if (!sender_name || !sender_email || !smtp_host || !smtp_port || !smtp_username || !smtp_password) {
    return NextResponse.json({ error: "请填写所有必填字段" }, { status: 400 });
  }

  const smtp_password_encrypted = encrypt(smtp_password);

  const { error } = await supabase.from("smtp_configs").upsert({
    user_id: user.id,
    sender_name,
    sender_email,
    smtp_host,
    smtp_port: Number(smtp_port),
    smtp_username,
    smtp_password_encrypted,
    secure_type: secure_type || "SSL",
    is_verified: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function getDecryptedConfig(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("smtp_configs")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!data) return null;

  return {
    ...data,
    smtp_password: decrypt(data.smtp_password_encrypted),
  };
}
