import nodemailer from "nodemailer";

interface SmtpConfig {
  sender_name: string;
  sender_email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string; // 已解密的明文密码
  secure_type: string; // SSL | TLS | STARTTLS
}

export function createTransporter(config: SmtpConfig) {
  const secure = config.secure_type === "SSL" || config.secure_type === "TLS";

  return nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port,
    secure,
    auth: {
      user: config.smtp_username,
      pass: config.smtp_password,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export async function sendEmail(
  config: SmtpConfig,
  to: string,
  subject: string,
  body: string,
  cc?: string
): Promise<void> {
  const transporter = createTransporter(config);
  await transporter.sendMail({
    from: `"${config.sender_name}" <${config.sender_email}>`,
    to,
    ...(cc ? { cc } : {}),
    subject,
    text: body,
  });
}

export async function verifyConnection(config: SmtpConfig): Promise<void> {
  const transporter = createTransporter(config);
  await transporter.verify();
}

/**
 * 把 nodemailer 的原始英文报错翻译成用户能看懂的中文提示。
 */
export function friendlySmtpError(err: unknown): string {
  const e = err as { code?: string; responseCode?: number; message?: string } | undefined;
  const raw = (e?.message || "").toLowerCase();
  const code = e?.code;
  const responseCode = e?.responseCode;

  // 认证失败：密码 / 授权码不对（最常见）
  if (
    responseCode === 535 ||
    code === "EAUTH" ||
    raw.includes("invalid login") ||
    raw.includes("username and password not accepted") ||
    raw.includes("authentication failed") ||
    raw.includes("badcredentials") ||
    raw.includes("5.7.8")
  ) {
    return "登录失败：用户名或密码不正确。注意大多数邮箱（Gmail、QQ、163、126 等）不能用邮箱登录密码，必须使用「应用专用密码 / 授权码」。请对照下方教程重新获取，并确认 SMTP 用户名填的是完整邮箱地址。";
  }

  // 加密方式 / 端口不匹配
  if (
    raw.includes("wrong version number") ||
    raw.includes("ssl") ||
    raw.includes("routines") ||
    code === "ESOCKET"
  ) {
    return "连接方式不匹配：加密方式或端口可能填错了。常见组合为「端口 465 + SSL」或「端口 587 + STARTTLS」，请调整后重试。";
  }

  // 连接不上服务器
  if (
    code === "ECONNECTION" ||
    code === "ECONNREFUSED" ||
    code === "EDNS" ||
    raw.includes("getaddrinfo") ||
    raw.includes("enotfound")
  ) {
    return "无法连接到 SMTP 服务器：请检查 SMTP 服务器地址和端口是否填写正确。";
  }

  // 超时
  if (code === "ETIMEDOUT" || raw.includes("timeout") || raw.includes("timed out")) {
    return "连接超时：服务器无响应，请检查 SMTP 服务器地址、端口，或稍后再试。";
  }

  // 发件人不被允许
  if (responseCode === 550 || responseCode === 553 || raw.includes("relay")) {
    return "发件人不被允许：发件人邮箱通常需要和 SMTP 登录账号保持一致，请检查「发件人邮箱」是否与登录邮箱相同。";
  }

  // 兜底：附上原始信息，方便排查
  return `连接失败${e?.message ? "：" + e.message : ""}。请对照下方教程检查配置，或联系客服。`;
}
