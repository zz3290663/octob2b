import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "未选择文件" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  if (!["png", "jpg", "jpeg", "webp", "svg"].includes(ext)) {
    return NextResponse.json({ error: "只支持 PNG、JPG、SVG 格式" }, { status: 400 });
  }

  const path = `${user.id}/logo.${ext}`;

  const { error } = await supabase.storage
    .from("company-logos")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage
    .from("company-logos")
    .getPublicUrl(path);

  // 加时间戳避免浏览器缓存旧图
  const urlWithTs = `${publicUrl}?t=${Date.now()}`;
  return NextResponse.json({ url: urlWithTs });
}
