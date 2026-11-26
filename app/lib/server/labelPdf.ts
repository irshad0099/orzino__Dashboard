import "server-only";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { business } from "../business";
import type { IOrder } from "./models/Order";

// Shipping labels: one 4x6 inch page per order (the standard thermal-label size; also prints
// fine on A4 with "fit to page"). Several orders → one multi-page PDF, so a whole day's
// dispatch prints in one go.

type LabelOrder = Pick<IOrder, "orderId" | "createdAt" | "items" | "pricing" | "customer" | "payment" | "shipment">;

const W = 288; // 4in
const H = 432; // 6in
const M = 14;
const INK = "#000000";

/** The last 6-digit number in the address — Indian PIN codes are written at the end. */
const pinCodeOf = (address: string) => address.match(/\b\d{6}\b/g)?.pop() ?? "";
const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

async function drawLabel(doc: PDFKit.PDFDocument, order: LabelOrder) {
  const inner = W - M * 2;
  const isCod = order.payment.method === "COD" && order.payment.status !== "verified";
  const packs = order.items.reduce((n, i) => n + i.quantity, 0);

  doc.lineWidth(1.2).strokeColor(INK).rect(M / 2, M / 2, W - M, H - M).stroke();

  // ── Header: brand + payment mode ───────────────────────────────────────────
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(14).text(business.brandName, M, M + 2);
  doc.font("Helvetica").fontSize(7).text(business.siteUrl, M, M + 18);
  const modeW = 120;
  doc.rect(W - M - modeW, M, modeW, 30).fill(INK);
  doc
    .fillColor("#FFFFFF")
    .font("Helvetica-Bold")
    .fontSize(isCod ? 9 : 12)
    .text(isCod ? "COD - COLLECT" : "PREPAID", W - M - modeW, M + (isCod ? 4 : 9), { width: modeW, align: "center" });
  if (isCod) {
    doc.fontSize(12).text(`Rs ${order.pricing.total}`, W - M - modeW, M + 15, { width: modeW, align: "center" });
  }

  let y = M + 38;
  doc.moveTo(M, y).lineTo(W - M, y).lineWidth(1).stroke();

  // ── Ship to ────────────────────────────────────────────────────────────────
  y += 6;
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(7).text("SHIP TO", M, y);
  doc.fontSize(12).text(order.customer.name, M, y + 10, { width: inner });
  doc.font("Helvetica").fontSize(9).text(order.customer.address, M, doc.y + 2, { width: inner });
  doc.font("Helvetica-Bold").fontSize(10).text(`Phone: ${order.customer.phone}`, M, doc.y + 4, { width: inner });
  const pin = pinCodeOf(order.customer.address);
  if (pin) doc.fontSize(16).text(`PIN ${pin}`, M, doc.y + 4, { width: inner });

  y = Math.max(doc.y + 8, 210);
  doc.moveTo(M, y).lineTo(W - M, y).stroke();

  // ── Order details + QR ─────────────────────────────────────────────────────
  const qrSize = 78;
  const qr = await QRCode.toBuffer(order.orderId, { margin: 0, width: qrSize * 3 });
  doc.image(qr, W - M - qrSize, y + 8, { width: qrSize, height: qrSize });

  const textW = inner - qrSize - 8;
  doc.font("Helvetica-Bold").fontSize(7).text("ORDER", M, y + 8);
  doc.fontSize(12).text(order.orderId, M, y + 17, { width: textW });
  doc
    .font("Helvetica")
    .fontSize(8)
    .text(`Date: ${fmtDate(order.createdAt)}`, M, doc.y + 3, { width: textW })
    .text(`Packs: ${packs}  ·  Weight: ${packs * 30}g (approx.)`, { width: textW })
    .text(`Declared value: Rs ${order.pricing.total}`, { width: textW });
  if (order.shipment) {
    doc
      .font("Helvetica-Bold")
      .text(`${order.shipment.courier}`, M, doc.y + 3, { width: textW })
      .text(`AWB: ${order.shipment.trackingNumber}`, { width: textW });
  }

  y = Math.max(doc.y + 8, y + qrSize + 16);
  doc.moveTo(M, y).lineTo(W - M, y).stroke();

  // ── Contents ───────────────────────────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(7).text("CONTENTS", M, y + 6);
  doc.font("Helvetica").fontSize(8);
  const maxLines = 4;
  order.items.slice(0, maxLines).forEach((i) => doc.text(`${i.quantity} x ${i.name}`, M, doc.y + 1, { width: inner }));
  if (order.items.length > maxLines) doc.text(`+ ${order.items.length - maxLines} more item(s)`, { width: inner });

  // ── Return address (pinned to the bottom) ──────────────────────────────────
  const fromY = H - M - 62;
  doc.moveTo(M, fromY).lineTo(W - M, fromY).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .text("FROM / RETURN TO", M, fromY + 5)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(business.legalName, M, fromY + 14, { width: inner })
    .font("Helvetica")
    .fontSize(7)
    .text(business.address, { width: inner })
    .text(`${business.phoneDisplay}  ·  GSTIN ${business.gstin}  ·  FSSAI ${business.fssaiLicenseNumber}`, { width: inner });
}

export async function buildLabelsPdf(orders: LabelOrder[]): Promise<Buffer> {
  const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: false });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  for (const order of orders) {
    doc.addPage({ size: [W, H], margin: 0 });
    await drawLabel(doc, order);
  }
  doc.end();
  return done;
}
