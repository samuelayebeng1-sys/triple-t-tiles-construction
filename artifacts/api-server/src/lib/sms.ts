import { logger } from "./logger.js";

const AT_LIVE_URL = "https://api.africastalking.com/version1/messaging";
const AT_SANDBOX_URL = "https://api.sandbox.africastalking.com/version1/messaging";

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

  const apiUrl = username === "sandbox" ? AT_SANDBOX_URL : AT_LIVE_URL;

  const body = new URLSearchParams({
    username,
    to: numbers.join(","),
    message: opts.message,
  });
  if (opts.senderId) body.set("from", opts.senderId);

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });

    const raw = await res.text();
    let json: { SMSMessageData?: { Message?: string; Recipients?: Array<{ status?: string; statusCode?: number; cost?: string; number?: string }> } } | null = null;
    try {
      json = JSON.parse(raw);
    } catch {
      // AT returned plain text (typical for auth errors)
    }

    if (!res.ok || !json) {
      const message = (json as { SMSMessageData?: { Message?: string } } | null)?.SMSMessageData?.Message || raw.trim() || `HTTP ${res.status}`;
      logger.error({ status: res.status, body: raw.slice(0, 500) }, "Africa's Talking SMS request failed");
      return { ok: false, error: `${message} (HTTP ${res.status})` };
    }

    const recipients = json.SMSMessageData?.Recipients ?? [];
    const successful = recipients.filter(r => r.status === "Success").length;

    // AT considers the API call OK even when individual recipients fail (e.g. InvalidPhoneNumber).
    // Surface that so the user knows.
    if (successful === 0 && recipients.length > 0) {
      const statuses = recipients.map(r => `${r.number ?? "?"}: ${r.status ?? "Unknown"}`).join(", ");
      logger.warn({ statuses, summary: json.SMSMessageData?.Message }, "All SMS recipients failed");
      return { ok: false, error: json.SMSMessageData?.Message || statuses };
    }

    logger.info({ successful, total: recipients.length, summary: json.SMSMessageData?.Message }, "SMS sent via Africa's Talking");
    return { ok: true, recipients: successful };
  } catch (err) {
    logger.error({ err }, "SMS send failed");
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
