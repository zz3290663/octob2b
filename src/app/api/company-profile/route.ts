import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data } = await supabase
    .from("company_profile")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json(data ?? {});
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await req.json();

  const { error } = await supabase
    .from("company_profile")
    .upsert({
      user_id: user.id,
      company_name_en: body.company_name_en ?? "",
      company_name_cn: body.company_name_cn ?? "",
      address: body.address ?? "",
      phone: body.phone ?? "",
      email: body.email ?? "",
      website: body.website ?? "",
      payment_terms: body.payment_terms ?? "T/T 30% deposit, 70% before shipment",
      delivery_days: Number(body.delivery_days) || 30,
      validity_days: Number(body.validity_days) || 30,
      bank_info: body.bank_info ?? "",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
