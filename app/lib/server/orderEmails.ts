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

/* ---------------------------------------------------------- review request */

type DeliveredOrder = Pick<IOrder, "orderId" | "customer" | "items">;

/**
 * "How was your order?" — sent when an order is marked delivered. With REVIEW_LINK_SECRET set,
 * the button opens /review?t=… where the customer can rate every product in the order (with
 * photos/videos) without signing in; otherwise it links to each product's reviews section.
 */
export async function sendReviewRequestEmail(order: DeliveredOrder, reviewToken: string | null): Promise<void> {
  if (!order.customer.email) return;
  const firstName = order.customer.name.split(" ")[0] || "there";
  const products = [...new Map(order.items.map((i) => [i.productId, i])).values()];
  const reviewLink = reviewToken ? `${siteUrl()}/review?t=${encodeURIComponent(reviewToken)}` : null;

  const productLinks = products
    .map((i) => {
      const href = reviewLink ?? `${siteUrl()}/products/${i.productId}#reviews`;
      return `<tr><td style="padding:8px 0;border-bottom:1px solid #EDD9C0">${esc(i.name)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #EDD9C0;text-align:right">
          <a href="${href}" style="color:#F5A300;text-decoration:none;font-size:18px;letter-spacing:2px">★★★★★</a>
        </td></tr>`;
    })
    .join("");

  const html = emailLayout(
    `How was your ORZINO order, ${esc(firstName)}?`,
    `<p style="margin:0 0 12px">Your order <b style="font-family:monospace">${esc(order.orderId)}</b> was delivered. We'd love to know what you thought — it takes 30 seconds and helps other snackers choose.</p>
     <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#181410;margin:0 0 16px">${productLinks}</table>
     <a href="${reviewLink ?? `${siteUrl()}/products/${products[0]?.productId ?? ""}#reviews`}" style="display:inline-block;background:#8B3A1A;color:#FFFFFF;text-decoration:none;font-weight:800;padding:12px 22px;border-radius:999px">Rate your order</a>
     <p style="margin:12px 0 0;color:#8A8179;font-size:12px">You can add photos or a short video too.${
       reviewLink ? "" : " You'll be asked to sign in with the account you ordered from."
     }</p>`
  );

  const text = [
    `How was your ORZINO order ${order.orderId}, ${firstName}?`,
    ...products.map((i) => `- ${i.name}`),
    `Rate it here: ${reviewLink ?? `${siteUrl()}/products/${products[0]?.productId ?? ""}#reviews`}`,
  ].join("\n");

  await sendEmail({ to: order.customer.email, subject: `How was your order? Rate it in 30 seconds`, html, text });
}

/* ------------------------------------------------------- question answered */

export async function sendQuestionAnsweredEmail(q: {
  productId: number;
  productName: string;
  name: string;
  email: string;
  question: string;
  answer: string;
}): Promise<void> {
  const link = `${siteUrl()}/products/${q.productId}#questions`;
  const html = emailLayout(
    `We answered your question, ${esc(q.name.split(" ")[0] || "there")}`,
    `<p style="margin:0 0 6px;color:#5C3A1E">About <b>${esc(q.productName)}</b>, you asked:</p>
     <p style="margin:0 0 12px;background:#FFF8F0;padding:12px;border-radius:10px">${esc(q.question)}</p>
     <p style="margin:0 0 6px;color:#5C3A1E">Our answer:</p>
     <p style="margin:0 0 16px;background:#DFF3E4;padding:12px;border-radius:10px">${esc(q.answer)}</p>
     <a href="${link}" style="display:inline-block;background:#8B3A1A;color:#FFFFFF;text-decoration:none;font-weight:800;padding:12px 22px;border-radius:999px">View on the product page</a>`
  );
  await sendEmail({
    to: q.email,
    subject: `Your question about ${q.productName} was answered`,
    html,
    text: `You asked about ${q.productName}: ${q.question}\n\nOur answer: ${q.answer}\n\n${link}`,
  });
}
