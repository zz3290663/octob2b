import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "请输入需求文字" }, { status: 400 });

  const prompt = `You are a procurement specialist. Extract product line items from the following customer requirement text.

Customer text:
"""
${text}
"""

Return a JSON array of line items. Each item must have:
- name: product name (string, preserve original language)
- spec: specifications like size, pressure rating, model number (string, can be empty string)
- quantity: numeric quantity (number, default 1 if not specified)
- unit: unit of measure like pcs, sets, kg, m, etc. (string, default "pcs")
- material: material if mentioned (string, can be empty string)
- notes: any delivery, quality, or other notes (string, can be empty string)

Return ONLY valid JSON array, no explanation text. Example:
[{"name":"Ball Valve","spec":"2 inch, 1000PSI","quantity":50,"unit":"pcs","material":"Stainless Steel 316","notes":""}]`;

  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        max_tokens: 1024,
        stream: false,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "AI 服务异常，请稍后再试" }, { status: 502 });
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ error: "AI 解析失败，请重新尝试" }, { status: 500 });

    const items = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "服务器异常" }, { status: 500 });
  }
}
