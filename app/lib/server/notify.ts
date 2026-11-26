import "server-only";

// Outgoing notifications: email (Resend) and an optional Telegram ping for the team.
// Same file as the customer site (orzino: app/lib/server/notify.ts) — keep them in sync.
//
// Everything here is OPTIONAL and FAIL-SAFE: if a key isn't configured the message is skipped
// (and logged), and a provider error is logged, never thrown — a notification must never be
// the reason an order fails. Call these from `after()` so they don't slow the response down.
//
// Env (all optional — see .env.example):
//   RESEND_API_KEY       Resend API key (https://resend.com → API Keys)
//   MAIL_FROM            e.g. "ORZINO <orders@orzino.com>" — the domain must be verified in Resend
//   MAIL_REPLY_TO        where customer replies go, e.g. support@orzino.com
//   ADMIN_NOTIFY_EMAILS  comma-separated team inboxes that get "new order" alerts
//   TELEGRAM_BOT_TOKEN   + TELEGRAM_CHAT_ID → instant "new order" message on the team's phone
//   SITE_URL             public storefront URL used in email links (default https://orzino.com)
//   ADMIN_URL            admin dashboard URL used in team alerts (optional)

export type Email = { to: string | string[]; subject: string; html: string; text: string };

const env = (name: string) => process.env[name]?.trim() || "";

export const siteUrl = () => env("SITE_URL").replace(/\/+$/, "") || "https://orzino.com";
export const adminUrl = () => env("ADMIN_URL").replace(/\/+$/, "");
export const adminEmails = () =>
  env("ADMIN_NOTIFY_EMAILS")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

export async function sendEmail(mail: Email): Promise<boolean> {
  const key = env("RESEND_API_KEY");
  const from = env("MAIL_FROM");
  const to = (Array.isArray(mail.to) ? mail.to : [mail.to]).filter(Boolean);
  if (to.length === 0) return false;
  if (!key || !from) {
    console.info(`[notify] email skipped (RESEND_API_KEY / MAIL_FROM not set): "${mail.subject}"`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        ...(env("MAIL_REPLY_TO") ? { reply_to: env("MAIL_REPLY_TO") } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[notify] email "${mail.subject}" failed: ${res.status} ${await res.text().catch(() => "")}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[notify] email "${mail.subject}" failed:`, error);
    return false;
  }
}

/** Plain-text Telegram message to the team chat. */
export async function sendTelegram(text: string): Promise<boolean> {
  const token = env("TELEGRAM_BOT_TOKEN");
  const chatId = env("TELEGRAM_CHAT_ID");
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[notify] telegram failed: ${res.status} ${await res.text().catch(() => "")}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[notify] telegram failed:", error);
    return false;
  }
}

/** Escapes customer-typed text before it goes into an HTML email. */
export const esc = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
