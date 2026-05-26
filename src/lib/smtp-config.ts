import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";

export async function getDecryptedSmtpConfig(userId: string) {
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
