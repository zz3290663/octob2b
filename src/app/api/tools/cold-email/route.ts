import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── 速率限制（有 Redis 时启用）────────────────────────────────────────────────
const ratelimit = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: false,
    })
  : null;

// ── Prompt 模板 ───────────────────────────────────────────────────────────────
function buildPrompt(input: {
  type: string;
  style: string;
  product: string;
  market: string;
  advantages: string;
  priceRange: string;
  moq: string;
  context?: string;
}) {
  const styleMap: Record<string, string> = {
    formal: "商务正式，适合传统行业大客户",
    casual: "轻松友好，适合中小买家",
    direct: "开门见山，适合时间紧的采购",
  };

  return `You are a professional B2B cold email writer for international trade. Generate a professional sales email based on the following information.

【User Input】
Email Type: ${input.type}
Writing Style: ${input.style} (${styleMap[input.style]})
Product: ${input.product}
Target Market: ${input.market}
Company Advantages: ${input.advantages}
Price Range: ${input.priceRange}
MOQ: ${input.moq}
${input.context ? `Context: ${input.context}` : ""}

【Requirements】
1. Professional, natural English that reads like a native speaker wrote it
2. 150-200 words, no longer
3. Structure: Hook opening + Value proposition + Clear CTA
4. Do NOT start with "I'm writing to..." or "I hope this email finds you well"
5. Match the tone strictly to the specified style
6. End with a specific, easy-to-act-on call to action

【Compliance】
- Refuse to generate content involving counterfeit goods, sanctioned countries, or weapons
- If input contains such content, return a refusal notice instead

Generate the email now:`;
}

// ── 获取/扣减额度 ─────────────────────────────────────────────────────────────
async function checkCredits(userId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profile")
    .select("credits, is_premium")
    .eq("id", userId)
    .single();

  if (!profile) return { allowed: false, reason: "用户不存在" };

  if (profile.is_premium) return { allowed: true, isPremium: true };

  if ((profile.credits ?? 0) <= 0) {
    return { allowed: false, reason: "free_limit", isPremium: false };
  }

  // 扣减次数
  await supabase
    .from("profile")
    .update({ credits: profile.credits - 1 })
    .eq("id", userId);

  return { allowed: true, isPremium: false, remaining: profile.credits - 1 };
}

// ── POST /api/tools/cold-email ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. 鉴权
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  // 2. 速率限制（按 IP）
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (ratelimit) {
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
    }
  }

  // 3. 检查额度
  const creditCheck = await checkCredits(user.id);
  if (!creditCheck.allowed) {
    return NextResponse.json(
      { error: creditCheck.reason === "free_limit" ? "free_limit" : creditCheck.reason },
      { status: 403 }
    );
  }

  // 4. 解析参数
  const body = await req.json();
  const { type, style, product, market, advantages, priceRange, moq, context } = body;

  if (!type || !product || !market || !style) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }

  // 5. 调用 DeepSeek
  const prompt = buildPrompt({ type, style, product, market, advantages, priceRange, moq, context });
  const start = Date.now();

  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        max_tokens: 512,
        stream: false,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("DeepSeek error:", err);
      return NextResponse.json({ error: "AI 服务异常，请稍后再试" }, { status: 502 });
    }

    const data = await res.json();
    const email = data.choices?.[0]?.message?.content;

    if (!email) {
      return NextResponse.json({ error: "生成内容为空" }, { status: 500 });
    }

    // 6. 存入 usage 表
    await supabase.from("usage").insert({
      user_id: user.id,
      tool: "cold-email",
      input: { type, style, product, market, advantages, priceRange, moq, context },
      result: email,
      ip_address: ip,
    });

    return NextResponse.json({
      email,
      isPremium: creditCheck.isPremium,
      remaining: creditCheck.isPremium ? null : (creditCheck as { remaining: number }).remaining,
      ms: Date.now() - start,
    });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json({ error: "服务器异常" }, { status: 500 });
  }
}