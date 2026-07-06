import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";

// 取用户某个发信邮箱（指定 configId 则取该条，否则取最早创建的一条）
export async function getDecryptedSmtpConfig(userId: string, configId?: string) {
  const supabase = await createClient();
  let query = supabase.from("smtp_configs").select("*").eq("user_id", userId);

  if (configId) {
    query = query.eq("id", configId);
  } else {
    query = query.order("updated_at", { ascending: true }).limit(1);
  }

  const { data } = await query.maybeSingle();
  if (!data) return null;

  return {
    ...data,
    smtp_password: decrypt(data.smtp_password_encrypted),
  };
}
