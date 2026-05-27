import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HistoryClient from "./HistoryClient";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: records } = await supabase
    .from("email_history")
    .select("id, type, company, subject, body, meta, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return <HistoryClient records={records ?? []} />;
}
