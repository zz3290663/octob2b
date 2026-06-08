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
