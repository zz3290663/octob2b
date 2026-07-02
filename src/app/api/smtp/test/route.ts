import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { sendEmail, verifyConnection, friendlySmtpError } from "@/lib/mailer";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: cfg } = await supabase
    .from("smtp_configs")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!cfg) return NextResponse.json({ error: "请先保存 SMTP 配置" }, { status: 400 });

  const smtpConfig = {
    sender_name: cfg.sender_name,
    sender_email: cfg.sender_email,
    smtp_host: cfg.smtp_host,
    smtp_port: cfg.smtp_port,
    smtp_username: cfg.smtp_username,
    smtp_password: decrypt(cfg.smtp_password_encrypted),
    secure_type: cfg.secure_type,
  };

  try {
    await verifyConnection(smtpConfig);

    const { data: { user: authUser } } = await supabase.auth.getUser();
    await sendEmail(
      smtpConfig,
      authUser!.email!,
      "【octob2b】SMTP 配置测试成功",
      `您好，\n\n这是一封测试邮件，说明您的 SMTP 配置已成功连接。\n\n发件人：${cfg.sender_name} <${cfg.sender_email}>\nSMTP 服务器：${cfg.smtp_host}:${cfg.smtp_port}\n\n— octob2b`
    );

    await supabase
      .from("smtp_configs")
      .update({ is_verified: true })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: friendlySmtpError(err) }, { status: 400 });
  }
}
