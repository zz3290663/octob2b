import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { fetchWebsiteContent } from "@/lib/scraper";

const STYLE_MAP: Record<string, string> = {
  formal: "professional and formal",
  casual: "friendly and approachable",
  direct: "direct and to-the-point",
};

function buildPrompt(params: {
  targetUrl: string;
  content: string;
  product: string;
  market: string;
  advantages?: string;
  priceRange?: string;
  name?: string;
  company?: string;
  style: string;
  previousSubject?: string;
  followUpNumber?: number;
}): string {
  const { targetUrl, content, product, market, advantages, priceRange, name, company, style, previousSubject, followUpNumber } = params;
  const isFollowUp = !!previousSubject && (followUpNumber ?? 1) > 1;
  const followUpNum = followUpNumber ?? 1;

  const followUpInstructions = isFollowUp ? `
---
IMPORTANT — This is follow-up #${followUpNum} (NOT a first email):
- Previous email subject: "${previousSubject}"
- Reference the previous email naturally in the opening (e.g. "I reached out last week about..." or "Following up on my previous note...")
- Do NOT repeat the same pitch — take a DIFFERENT angle or highlight a new benefit
- Keep it shorter than the first email (100-150 words max)
${followUpNum >= 3 ? `- This is a late-stage follow-up — use a brief "break-up" style: acknowledge they're busy, make it easy to say no, but leave the door open` : "- Create gentle urgency without being pushy"}` : "";

  return `You are a professional B2B sales expert. Analyze this company's website and write a highly personalized ${isFollowUp ? `follow-up email (#${followUpNum})` : "cold email"}.

Website: ${targetUrl}
Content:
${content}

---
Sender's Product: ${product}
Target Market: ${market}
${advantages ? `Advantages: ${advantages}` : ""}
${priceRange ? `Price Range: ${priceRange}` : ""}
${name || company ? `Contact: ${[name, company].filter(Boolean).join(" / ")}` : ""}
${followUpInstructions}
---
${isFollowUp ? "" : `Instructions:
- Analyze the company's business and identify their likely procurement needs
- Reference something SPECIFIC from their website
- Connect their actual business to the sender's product naturally`}
- Tone: ${STYLE_MAP[style] || "professional"}, native English
- Do NOT open with "I hope this email finds you well" or "I'm writing to..."
- End with a specific, low-friction CTA

Output ONLY valid JSON:
{
  "company_name": "company name from website",
  "main_business": "2 sentences about their main business",
  "pain_points": "1-2 likely procurement pain points or needs",
  "subject": "email subject line",
  "body": "full email body"
}`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { url, email, name, company, product, market, advantages, priceRange, style, previousSubject, followUpNumber } = await req.json();
  if (!url || !email || !product || !market) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }

  // 抓取网站内容
  let content: string;
  let targetUrl: string;
  try {
    const result = await fetchWebsiteContent(url);
    content = result.content;
    targetUrl = result.url;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const prompt = buildPrompt({ targetUrl, content, product, market, advantages, priceRange, name, company, style, previousSubject, followUpNumber });

  try {
    const aiRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        max_tokens: 800,
        stream: false,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) return NextResponse.json({ error: "AI 服务异常，请稍后重试" }, { status: 502 });

    const aiData = await aiRes.json();
    const result = JSON.parse(aiData.choices?.[0]?.message?.content || "{}");

    await supabase.from("email_history").insert({
      user_id: user.id,
      type: "bulk_email",
      company: result.company_name || company || null,
      subject: result.subject,
      body: result.body,
      meta: { source: "smart_email", url: targetUrl, followUpNumber: followUpNumber ?? 1 },
    });

    return NextResponse.json({ ...result, url: targetUrl });
  } catch (err) {
    console.error("smart-email error:", err);
    return NextResponse.json({ error: "分析失败，请重试" }, { status: 500 });
  }
}
