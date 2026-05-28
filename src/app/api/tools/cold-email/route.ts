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

// ── 系统模板写作风格提示 ──────────────────────────────────────────────────────
const TEMPLATE_HINTS: Record<string, string> = {
  cold_classic:
    "Classic first-contact cold email. Grab attention fast with an industry insight or specific pain point. Introduce your product with 1-2 strong differentiators. End with a low-friction CTA. Be direct, concise, no fluff.",
  company_intro:
    "Professional company introduction. Build credibility first (founding year, scale, certifications). Describe key products and capabilities. Highlight what makes you different from typical suppliers. Close with an invitation to connect or request a catalog/samples.",
  quote_followup:
    "Post-quote follow-up email. Reference the previous quote or discussion naturally. Address potential hesitation by adding value, clarification, or flexibility. Create gentle urgency without being pushy. Make the next step extremely easy.",
  reactivate:
    "Dormant customer reactivation. Open warmly and acknowledge the time since last contact. Share something genuinely new — a new product, better pricing, new certification, or market insight. Keep the CTA soft and easy to respond to. Feel like a real person, not a template.",
  new_product:
    "New product introduction to an existing contact. Hook immediately with the problem the new product solves. List 2-3 features specifically relevant to their industry or past interest. Offer a sample, trial, or quick call to see it.",
  holiday:
    "Warm seasonal or holiday greeting. Lead with genuine warmth appropriate to the holiday. Keep business content minimal — this is about the relationship, not the sale. End with a friendly, no-pressure close. Tone: human and warm, never salesy.",
  order_push:
    "Existing customer order nudge. This customer has bought from you before — open by referencing the relationship warmly. Naturally bring up reorder timing or seasonal demand cycles. Offer something concrete (updated pricing, priority production slot, or a small incentive). Keep it confident and friendly, never desperate.",
  visit_request:
    "In-person visit request. Politely ask for permission to visit their office or facility. Clearly explain the value of meeting in person — new samples to show, deeper discussion of their needs, or relationship building. Propose a flexible time window. Make it extremely easy for them to say yes.",
  expo_invite:
    "Trade show booth invitation. Invite the contact to visit your booth at an upcoming exhibition. Mention the show name, dates, and booth number prominently in the email. Highlight what they will see: new products, live demonstrations, exclusive show pricing. Create light urgency around the event date without pressure.",
  meeting_invite:
    "Online meeting invitation. Propose a short 15-30 minute video call. State the agenda clearly and upfront so they know exactly what to expect. Suggest 2-3 specific time slot options and offer flexibility to reschedule. Lead with the benefit they will get from the call, not the benefit to you.",
};

// ── Prompt 模板 ───────────────────────────────────────────────────────────────
function buildPrompt(input: {
  templateKey?: string;
  style: string;
  product: string;
  market: string;
  advantages: string;
  priceRange: string;
  moq: string;
  context?: string;
}) {
  const styleMap: Record<string, string> = {
    formal: "professional and formal",
    casual: "friendly and approachable",
    direct: "direct and to-the-point",
  };

  const templateHint = input.templateKey ? TEMPLATE_HINTS[input.templateKey] : null;

  return `You are a professional B2B cold email writer for international trade. Generate a professional sales email based on the following information.

【Email Style】
${templateHint ?? "Professional cold outreach email."}
Tone: ${styleMap[input.style] ?? "professional"}

【Sender Information】
Product: ${input.product}
Target Market: ${input.market}
${input.advantages ? `Company Advantages: ${input.advantages}` : ""}
${input.priceRange ? `Price Range: ${input.priceRange}` : ""}
${input.moq ? `MOQ: ${input.moq}` : ""}
${input.context ? `Context / Background: ${input.context}` : ""}

【Requirements】
1. Professional, natural English that reads like a native speaker wrote it
2. 150-200 words, no longer
3. Do NOT start with "I'm writing to..." or "I hope this email finds you well"
4. Follow the Email Style instructions above strictly
5. End with a specific, easy-to-act-on call to action

【Compliance】
- Refuse to generate content involving counterfeit goods, sanctioned countries, or weapons

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
  const { templateKey, style, product, market, advantages, priceRange, moq, context } = body;

  if (!product || !market) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }

  // 5. 调用 DeepSeek
  const prompt = buildPrompt({ templateKey, style: style || "formal", product, market, advantages, priceRange, moq, context });
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
      input: { templateKey, style, product, market, advantages, priceRange, moq, context },
      result: email,
      ip_address: ip,
    });

    // 7. 存入历史记录表
    await supabase.from("email_history").insert({
      user_id: user.id,
      type: "cold_email",
      company: null,
      subject: null,
      body: email,
      meta: { templateKey, style, product, market, advantages },
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