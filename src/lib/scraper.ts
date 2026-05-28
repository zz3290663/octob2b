const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "max-age=0",
  "Upgrade-Insecure-Requests": "1",
};

export function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ").trim().slice(0, 5000);
}

function buildUrlVariants(rawUrl: string): string[] {
  let base = rawUrl.trim();
  if (!/^https?:\/\//i.test(base)) base = "https://" + base;

  const variants: string[] = [base];
  try {
    const p = new URL(base);
    // 如果没有 www，补一个 www 变体
    if (!p.hostname.startsWith("www.")) {
      variants.push(`${p.protocol}//www.${p.hostname}${p.pathname}${p.search}`);
    }
    // https 失败则尝试 http
    if (p.protocol === "https:") {
      variants.push(`http://${p.hostname}${p.pathname}${p.search}`);
    }
  } catch { /* ignore */ }

  return variants;
}

async function tryFetch(url: string, timeout = 15000): Promise<string> {
  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(timeout),
    redirect: "follow",
  });
  return res.text();
}

export async function fetchWebsiteContent(rawUrl: string): Promise<{ content: string; url: string }> {
  const variants = buildUrlVariants(rawUrl);
  let lastError = "无法访问该网站";

  for (const url of variants) {
    try {
      const html = await tryFetch(url);
      let content = extractText(html);

      // 内容太少时，尝试 /about 子页面补充
      if (content.length > 0 && content.length < 300) {
        try {
          const origin = new URL(url).origin;
          const aboutHtml = await tryFetch(`${origin}/about`, 8000);
          const aboutContent = extractText(aboutHtml);
          if (aboutContent.length > content.length) content = aboutContent;
        } catch { /* ignore */ }
      }

      if (content.length >= 100) return { content, url };

      lastError = "网站内容过少，可能是纯图片网站或需要登录才能访问";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("timeout") || msg.includes("Timeout")) {
        lastError = "网站响应超时（超过15秒），请确认网址可以正常打开";
      } else if (msg.includes("ENOTFOUND") || msg.includes("getaddrinfo")) {
        lastError = "域名无法解析，请检查网址是否正确（如 https://www.example.com）";
      } else if (msg.includes("ECONNREFUSED")) {
        lastError = "网站拒绝连接，请确认网址可以正常访问";
      } else {
        lastError = `访问失败：${msg.slice(0, 80)}`;
      }
    }
  }

  throw new Error(lastError);
}
