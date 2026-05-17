import { and, gte, lt } from "drizzle-orm";
import { db, settingsTable, entriesTable } from "@workspace/db";
import { sendSms } from "./sms.js";
import { logger } from "./logger.js";

export const LOW_STOCK_THRESHOLD = 10;

function fmtGHS(amount: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(amount);
}

async function getSettings() {
  const [s] = await db.select().from(settingsTable).limit(1);
  return s ?? null;
}

function recipientsFrom(s: { phone: string; smsRecipients: string[] | null }): string[] {
  return [s.phone, ...(s.smsRecipients ?? [])]
    .map(n => (n ?? "").trim())
    .filter(Boolean);
}

/**
 * Send an SMS to the configured owner recipients, with automatic Sender ID fallback
 * when the configured ID hasn't been approved by Africa's Talking.
 */
async function sendOwnerSms(message: string, label: string): Promise<void> {
  const s = await getSettings();
  if (!s) {
    logger.warn({ label }, "Skipping SMS — settings row missing");
    return;
  }
  const numbers = recipientsFrom(s);
  if (numbers.length === 0) {
    logger.warn({ label }, "Skipping SMS — no recipients configured");
    return;
  }

  let result = await sendSms({ to: numbers, senderId: s.smsSenderId, message });
  if (!result.ok && /InvalidSenderId/i.test(result.error ?? "")) {
    result = await sendSms({ to: numbers, message });
  }

  if (!result.ok) {
    logger.error({ label, error: result.error }, "Owner SMS failed");
  } else {
    logger.info({ label, recipients: result.recipients }, "Owner SMS sent");
  }
}

export async function notifyCreditSale(opts: {
  branch: string;
  customerName: string | null;
  customerPhone: string | null;
  creditAmount: number;
  productSummary: string;
}): Promise<void> {
  const s = await getSettings();
  if (!s || !s.smsCredit) return;
  const who = opts.customerName ? `${opts.customerName}${opts.customerPhone ? ` (${opts.customerPhone})` : ""}` : "Unknown customer";
  const msg = `Credit sale @ ${opts.branch}: ${fmtGHS(opts.creditAmount)} — ${opts.productSummary}. Customer: ${who}.`;
  await sendOwnerSms(msg, "credit_sale");
}

export async function notifyLowStock(items: Array<{ productName: string; location: string; quantity: number }>): Promise<void> {
  if (items.length === 0) return;
  const s = await getSettings();
  if (!s || !s.smsLowStock) return;
  const lines = items.slice(0, 6).map(i => `${i.productName} @ ${i.location}: ${i.quantity} left`);
  const more = items.length > 6 ? ` +${items.length - 6} more` : "";
  const msg = `Low stock alert (≤${LOW_STOCK_THRESHOLD}): ${lines.join("; ")}${more}.`;
  await sendOwnerSms(msg, "low_stock");
}

async function sendDailySummary(): Promise<boolean> {
  const s = await getSettings();
  if (!s || !s.smsDaily) return false;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const todays = await db
    .select()
    .from(entriesTable)
    .where(and(gte(entriesTable.createdAt, start), lt(entriesTable.createdAt, end)));

  if (todays.length === 0) {
    await sendOwnerSms(`Daily summary: no sales recorded today.`, "daily_summary");
    return true;
  }

  const total = todays.reduce((a, e) => a + e.totalAmount, 0);
  const cash = todays.reduce((a, e) => a + e.totalCash, 0);
  const momo = todays.reduce((a, e) => a + e.totalMomo, 0);
  const credit = todays.reduce((a, e) => a + e.totalCredit, 0);
  const profit = todays.reduce((a, e) => a + e.totalProfit, 0);

  const msg = `Daily summary — Total: ${fmtGHS(total)} | Cash: ${fmtGHS(cash)} | MoMo: ${fmtGHS(momo)} | Credit: ${fmtGHS(credit)} | Profit: ${fmtGHS(profit)} (${todays.length} entries).`;
  await sendOwnerSms(msg, "daily_summary");
  return true;
}

// Track the last local date (YYYY-MM-DD) on which we successfully sent a summary
// so we don't double-send. Local basis matches the local-clock trigger below.
let lastDailySummarySentLocal = "";
let schedulerStarted = false;

function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startDailySummaryScheduler(): void {
  if (schedulerStarted) {
    logger.warn("Daily summary scheduler already started — ignoring duplicate call");
    return;
  }
  schedulerStarted = true;

  // Check every minute. Cheap enough and avoids needing a real cron lib.
  setInterval(async () => {
    try {
      const s = await getSettings();
      if (!s || !s.smsDaily) return;

      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const target = (s.smsDailyTime || "20:00").slice(0, 5);
      if (hhmm !== target) return;

      const today = localDateString(now);
      if (lastDailySummarySentLocal === today) return;

      // Only mark the day as "sent" if the send actually succeeded — otherwise allow retry next tick.
      const ok = await sendDailySummary();
      if (ok) lastDailySummarySentLocal = today;
    } catch (err) {
      logger.error({ err }, "Daily summary scheduler tick failed");
    }
  }, 60 * 1000);

  logger.info("Daily summary scheduler started");
}
