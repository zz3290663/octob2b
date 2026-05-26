import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const SCENARIO_DESC: Record<string, string> = {
  reactivate: "Old customer reactivation — reconnect with an existing customer you haven't spoken with in a while. Reference the past relationship warmly.",
  new_product: "New product introduction — introduce a new product to an existing customer. Highlight what's new and why it suits them.",
  quote_followup: "Quote follow-up — follow up after sending a quotation that received no reply. Be polite but create gentle urgency.",
  lost_deal: "Lost deal re-engagement — re-approach a prospect who didn't convert previously. Acknowledge time has passed, offer fresh value.",
  holiday: "Holiday greeting — warm, genuine holiday greetings that maintain the business relationship without being too salesy.",
};

function buildPrompt(
  customer: Record<string, string>,
  scenario: string,
  extraRequirements: string
): string {
  const scenarioDesc = SCENARIO_DESC[scenario] || scenario;

  const info = [
    customer.company && `Company: ${customer.company}`,
    customer.name && `Contact Name: ${customer.name}`,
    customer.country && `Country/Region: ${customer.country}`,
    customer.position && `Position: ${customer.position}`,
    customer.product && `Product Interest: ${customer.product}`,
    customer.website && `Website: ${customer.website}`,
    customer.customer_type && `Customer Type: ${customer.customer_type}`,
    customer.last_contact_date && `Last Contact Date: ${customer.last_contact_date}`,
    customer.previous_inquiry && `Previous Inquiry: ${customer.previous_inquiry}`,
    customer.note && `Notes: ${customer.note}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are a professional B2B email writer for international trade. Write a personalized outreach email.

【Scenario】
${scenarioDesc}

【Customer Information】
${info || "(Limited info — write a general but professional email)"}

${extraRequirements ? `【Additional Requirements from Sender】\n${extraRequirements}\n` : ""}
【Writing Rules】
1. Professional, natural English — reads like a native speaker wrote it
2. 150–200 words, no longer
3. Structure: Engaging hook → Value / reason for writing → Specific CTA
4. Do NOT start with "I hope this email finds you well" or "I'm writing to inform you"
5. Personalize using the customer info — don't write a generic template
6. End with a single, easy-to-act-on call to action

Output EXACTLY in this format (no extra text, no markdown):
SUBJECT: [subject line here]
BODY:
[email body here]`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { customer, scenario, extraRequirements } = await req.json();
  if (!customer?.email) {
    return NextResponse.json({ error: "缺少邮箱" }, { status: 400 });
  }

  const prompt = buildPrompt(customer, scenario || "reactivate", extraRequirements || "");

  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        max_tokens: 600,
        stream: false,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "AI服务异常" }, { status: 502 });
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content || "";

    const subjectMatch = content.match(/SUBJECT:\s*(.+)/i);
    const bodyMatch = content.match(/BODY:\s*([\s\S]+)/i);

    const subject = subjectMatch?.[1]?.trim() || "Following up";
    const body = bodyMatch?.[1]?.trim() || content.trim();

    return NextResponse.json({ subject, body });
  } catch (err) {
    console.error("bulk-email error:", err);
    return NextResponse.json({ error: "服务器异常" }, { status: 500 });
  }
}
