import "server-only";

// Customer emails sent from the dashboard. The "order placed" email is sent by the customer
// site (orzino: app/lib/server/orderEmails.ts); this file sends the dispatch / tracking update
// when an order is marked shipped. Keep the look of both in sync.

import { business } from "../business";
import { esc, sendEmail, siteUrl } from "./notify";
import type { IOrder } from "./models/Order";

type ShippedOrder = Pick<IOrder, "orderId" | "customer" | "items" | "pricing" | "payment" | "shipment">;

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function emailLayout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#F0EAE0;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0EAE0;padding:24px 12px"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden">
      <tr><td style="background:#181410;padding:18px 24px;color:#FFC300;font-weight:900;font-size:20px;letter-spacing:1px">ORZINO</td></tr>
      <tr><td style="padding:24px;color:#181410;font-size:14px;line-height:1.55">
        <h1 style="margin:0 0 12px;font-size:20px">${title}</h1>
        ${body}
      </td></tr>
      <tr><td style="padding:16px 24px;background:#FFF8F0;color:#8A8179;font-size:12px">
        ${esc(business.legalName)} · ${esc(business.address)}<br>
        Questions? Reply to this email or WhatsApp us on ${esc(business.phoneDisplay)}.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

/** "Your order has shipped" + courier tracking. Never throws; no-op without a customer email. */
export async function sendShippedEmail(order: ShippedOrder): Promise<void> {
  if (!order.customer.email) return;
  const firstName = order.customer.name.split(" ")[0] || "there";
  const s = order.shipment;
  const orderLink = `${siteUrl()}/orders/${encodeURIComponent(order.orderId)}`;
  const codDue = order.payment.method === "COD" && order.payment.status !== "verified";

  const trackingHtml = s
    ? `<table cellpadding="0" cellspacing="0" style="width:100%;background:#DFF3E4;border-radius:12px;margin:0 0 16px"><tr><td style="padding:14px 16px;font-size:14px">
         Courier: <b>${esc(s.courier)}</b><br>
         Tracking number: <b style="font-family:monospace">${esc(s.trackingNumber)}</b>
         ${
           s.trackingUrl
             ? `<br><a href="${esc(s.trackingUrl)}" style="color:#1B7A3D;font-weight:800">Track your shipment →</a>`
             : ""
         }
       </td></tr></table>`
    : `<p style="margin:0 0 16px">Tracking details will appear on your order page shortly.</p>`;

  const html = emailLayout(
    `Good news, ${esc(firstName)} — your order is on its way!`,
    `<p style="margin:0 0 12px">Order <b style="font-family:monospace">${esc(order.orderId)}</b> has been handed to our delivery partner.</p>
     ${trackingHtml}
     <p style="margin:0 0 8px">${order.items.map((i) => `${esc(i.name)} × ${i.quantity}`).join("<br>")}</p>
     ${codDue ? `<p style="margin:0 0 16px"><b>Cash on Delivery:</b> please keep ${rupees(order.pricing.total)} ready.</p>` : ""}
     <a href="${orderLink}" style="display:inline-block;background:#8B3A1A;color:#FFFFFF;text-decoration:none;font-weight:800;padding:12px 22px;border-radius:999px">View your order</a>`
  );

  const text = [
    `Good news, ${firstName} — your ORZINO order ${order.orderId} has shipped!`,
    s ? `Courier: ${s.courier}` : "",
    s ? `Tracking number: ${s.trackingNumber}` : "",
    s?.trackingUrl ? `Track: ${s.trackingUrl}` : "",
    codDue ? `Cash on Delivery: please keep ${rupees(order.pricing.total)} ready.` : "",
    `View your order: ${orderLink}`,
  ]
    .filter(Boolean)
    .join("\n");

  await sendEmail({ to: order.customer.email, subject: `Shipped — your ORZINO order ${order.orderId}`, html, text });
}
