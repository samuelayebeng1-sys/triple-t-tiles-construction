import { logger } from "./logger.js";

const AT_API_URL = "https://api.africastalking.com/version1/messaging";

export interface SendSmsOptions {
  to: string[];
  message: string;
  senderId?: string;
}

export interface SendSmsResult {
  ok: boolean;
  recipients?: number;
  error?: string;
}

function normalize(num: string): string {
  const trimmed = num.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("00")) return "+" + trimmed.slice(2);
  if (trimmed.startsWith("0") && trimmed.length === 10) return "+233" + trimmed.slice(1);
  return trimmed;
}

export async function sendSms(opts: SendSmsOptions): Promise<SendSmsResult> {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;

  if (!apiKey || !username) {
    logger.warn({ to: opts.to.length }, "SMS not sent — Africa's Talking credentials not configured");
    return { ok: false, error: "SMS provider not configured. Set AT_API_KEY and AT_USERNAME." };
  }

  const numbers = Array.from(new Set(opts.to.map(normalize).filter(Boolean)));
  if (numbers.length === 0) {
    return { ok: false, error: "No recipient numbers provided" };
  }

  const body = new URLSearchParams({
    username,
    to: numbers.join(","),
    message: opts.message,
  });
  if (opts.senderId) body.set("from", opts.senderId);

  try {
    const res = await fetch(AT_API_URL, {
      method: "POST",
      headers: {
        apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });
    const json = (await res.json()) as { SMSMessageData?: { Recipients?: unknown[] } };
    if (!res.ok) {
      logger.error({ status: res.status, json }, "Africa's Talking SMS request failed");
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const count = json.SMSMessageData?.Recipients?.length ?? 0;
    logger.info({ count, numbers: numbers.length }, "SMS sent via Africa's Talking");
    return { ok: true, recipients: count };
  } catch (err) {
    logger.error({ err }, "SMS send failed");
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
