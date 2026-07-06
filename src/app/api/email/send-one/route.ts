import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { sendEmail, friendlySmtpError } from "@/lib/mailer";
import { NextRequest, NextResponse } from "next/server";

// 每个发信邮箱每天最多发送数量
const DAILY_LIMIT_PER_EMAIL = 50;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { customer_email, customer_company, subject, content, cc, smtpConfigId } = await req.json();
  if (!customer_email || !subject || !content) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }

  // 获取指定发信邮箱（不传则取最早的一条）
  let cfgQuery = supabase.from("smtp_configs").select("*").eq("user_id", user.id);
  cfgQuery = smtpConfigId ? cfgQuery.eq("id", smtpConfigId) : cfgQuery.order("updated_at", { ascending: true }).limit(1);
  const { data: cfg } = await cfgQuery.maybeSingle();

  if (!cfg) return NextResponse.json({ error: "请先配置 SMTP 发件信息" }, { status: 400 });
  if (!cfg.is_verified) return NextResponse.json({ error: "该发信邮箱尚未通过测试验证" }, { status: 400 });

  // 检查该邮箱今日发送数量限制
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("email_sends")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("smtp_config_id", cfg.id)
    .eq("status", "sent")
    .gte("sent_at", todayStart.toISOString());

  if ((count ?? 0) >= DAILY_LIMIT_PER_EMAIL) {
    return NextResponse.json({ error: `该邮箱已达今日发送上限（${DAILY_LIMIT_PER_EMAIL} 封），换个邮箱或明天再试` }, { status: 429 });
  }

  const smtpConfig = {
    sender_name: cfg.sender_name,
    sender_email: cfg.sender_email,
    smtp_host: cfg.smtp_host,
    smtp_port: cfg.smtp_port,
    smtp_username: cfg.smtp_username,
    smtp_password: decrypt(cfg.smtp_password_encrypted),
    secure_type: cfg.secure_type,
  };

  // 插入发送记录
  const { data: record, error: insertError } = await supabase
    .from("email_sends")
    .insert({
      user_id: user.id,
      smtp_config_id: cfg.id,
      customer_email,
      customer_company: customer_company || null,
      subject,
      content,
      status: "sending",
      scheduled_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError) return NextResponse.json({ error: "数据库写入失败" }, { status: 500 });

  // 拼接签名
  const signature = cfg.signature?.trim();
  const finalContent = signature ? `${content}\n\n--\n${signature}` : content;

  // 发送邮件
  try {
    await sendEmail(smtpConfig, customer_email, subject, finalContent, cc || undefined);

    await supabase
      .from("email_sends")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", record.id);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const rawMessage = err instanceof Error ? err.message : "发送失败";
    await supabase
      .from("email_sends")
      .update({ status: "failed", error_message: rawMessage })
      .eq("id", record.id);

    return NextResponse.json({ error: friendlySmtpError(err) }, { status: 500 });
  }
}
