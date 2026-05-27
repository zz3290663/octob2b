import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000);
}

function buildPrompt(url: string, content: string): string {
  return `你是一名专业的外贸销售顾问，擅长分析海外客户。请根据以下公司网站内容，生成一份完整的客户画像报告，全部用中文输出。

网站地址：${url}
网站内容：
${content}

请严格按照以下 JSON 格式输出，不要输出任何其他文字：
{
  "company_name": "公司名称（从内容推断，英文保留原文）",
  "main_business": "主营业务，2-3句话描述",
  "company_type": "公司定位，从以下选一个或组合：制造商 / 贸易商 / 品牌商 / 零售商 / 代理商 / 工程商",
  "scale": "规模评估：大型/中型/小型，附上判断依据（1句话）",
  "target_market": "主要目标市场国家或地区",
  "products": "核心产品列表，用逗号分隔",
  "strengths": "公司核心优势，2-3点",
  "pain_points": "该客户可能的采购痛点或需求，2-3点",
  "approach_strategy": "建议的开发话术方向，具体说明应该强调什么、怎么打动他们，3-4句话",
  "rating": "客户质量等级：A级（高价值优先跟进）/ B级（值得跟进）/ C级（一般客户）",
  "rating_reason": "评级理由，1-2句话"
}`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "请输入网址" }, { status: 400 });

  // 标准化 URL
  let targetUrl = url.trim();
  if (!/^https?:\/\//i.test(targetUrl)) targetUrl = "https://" + targetUrl;

  // 抓取网站内容
  let content = "";
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    content = extractText(html);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: `无法访问该网站：${msg}，请检查网址是否正确` }, { status: 400 });
  }

  if (content.length < 100) {
    return NextResponse.json({ error: "网站内容过少，可能是纯图片网站或需要登录才能访问" }, { status: 400 });
  }

  // 调用 AI 分析
  const prompt = buildPrompt(targetUrl, content);

  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        max_tokens: 1000,
        stream: false,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) return NextResponse.json({ error: "AI 服务异常，请稍后重试" }, { status: 502 });

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    const report = JSON.parse(raw);

    return NextResponse.json({ report, url: targetUrl });
  } catch (err) {
    console.error("client-radar error:", err);
    return NextResponse.json({ error: "分析失败，请重试" }, { status: 500 });
  }
}
