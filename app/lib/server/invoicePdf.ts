import "server-only";
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { business as siteConfig } from "../business";

export type InvoicePdfInput = {
  invoiceNumber?: string;
  issuedAt?: string | Date;
  items: { name: string; price: number; quantity: number }[];
  subtotal: number;
  gst: number;
  deliveryCharge: number;
  grandTotal: number;
  customer?: { name: string; phone: string; email?: string; address: string };
  payment?: { method: string; reference?: string; status: "pending" | "verification_pending" | "verified" };
};

const INK = "#181410";
const BROWN = "#5C3A1E";
const RUST = "#8B3A1A";
const GOLD = "#FFC300";
const BORDER = "#EDD9C0";
const MUTED = "#8A8179";

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function paymentBadgeText(status: "pending" | "verification_pending" | "verified", method?: string) {
  const isCod = method === "COD" || method === "Cash on Delivery";
  if (status === "pending") return "Payment pending";
  if (isCod) return status === "verified" ? "Cash collected on delivery" : "Cash on Delivery";
  return status === "verified" ? "Paid via UPI" : "Paid via UPI - verification pending";
}

/**
 * Builds the invoice PDF entirely server-side (text + simple shapes, no DOM screenshot) —
 * the result is a small, crisp, text-selectable PDF and nothing heavy ever ships to the
 * customer's device. Call from an API route; never from client code.
 */
export async function buildInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    // Top accent bar
    doc.rect(0, 0, doc.page.width, 6).fill(RUST);
    doc.y = 30;

    // Header: logo + business info (left), invoice meta (right)
    const headerTop = doc.y;
    let logoWidth = 0;
    try {
      // A small (~3KB) pre-resized copy, not the full-size site logo (~195KB) — embedding
      // the big one bloated the PDF enough to noticeably slow the download on weak mobile
      // connections, which defeats the entire point of generating this server-side.
      const logoPath = path.join(process.cwd(), "public", "logo-invoice.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, left, headerTop, { width: 44, height: 44 });
        logoWidth = 44 + 12;
      }
    } catch {
      // Logo is a nice-to-have — never fail the invoice over it.
    }

    const infoX = left + logoWidth;
    doc
      .fillColor(INK)
      .font("Helvetica-Bold")
      .fontSize(15)
      .text(siteConfig.legalName, infoX, headerTop, { width: pageWidth - logoWidth - 170 });
    doc
      .fillColor(BROWN)
      .font("Helvetica")
      .fontSize(8.5)
      .text(siteConfig.address, infoX, doc.y + 2, { width: pageWidth - logoWidth - 170 })
      .text(siteConfig.email)
      .text(`GSTIN: ${siteConfig.gstin}`);

    const metaX = left + pageWidth - 170;
    doc
      .fillColor(INK)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(`Invoice: ${input.invoiceNumber ?? "Preview"}`, metaX, headerTop, { width: 170, align: "right" });
    doc
      .fillColor(BROWN)
      .font("Helvetica")
      .fontSize(8.5)
      .text(`Date: ${formatDate(input.issuedAt ?? new Date())}`, metaX, doc.y + 2, { width: 170, align: "right" });
    if (input.payment) {
      doc
        .fillColor(RUST)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(paymentBadgeText(input.payment.status, input.payment.method).toUpperCase(), metaX, doc.y + 4, {
          width: 170,
          align: "right",
        });
    }

    doc.y = Math.max(doc.y, headerTop + 44) + 14;
    doc.moveTo(left, doc.y).lineTo(left + pageWidth, doc.y).lineWidth(1.5).strokeColor(INK).stroke();
    doc.moveDown(0.8);

    // Billed to
    if (input.customer) {
      doc.fillColor(INK).font("Helvetica-Bold").fontSize(8.5).text("BILLED TO", left, doc.y);
      doc
        .fillColor(INK)
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .text(input.customer.name, left, doc.y + 2);
      doc
        .fillColor(BROWN)
        .font("Helvetica")
        .fontSize(8.5)
        .text(`${input.customer.phone}${input.customer.email ? ` · ${input.customer.email}` : ""}`)
        .text(input.customer.address, { width: pageWidth });
      doc.moveDown(0.8);
    }

    // Items table
    const colItem = left;
    const colQty = left + pageWidth - 220;
    const colPrice = left + pageWidth - 150;
    const colTotal = left + pageWidth - 70;
    const tableTop = doc.y;

    doc.rect(left, tableTop, pageWidth, 20).fill(INK);
    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("ITEM", colItem + 8, tableTop + 6)
      .text("QTY", colQty, tableTop + 6, { width: 50, align: "center" })
      .text("PRICE", colPrice, tableTop + 6, { width: 60, align: "right" })
      .text("TOTAL", colTotal, tableTop + 6, { width: 70, align: "right" });

    let rowY = tableTop + 20;
    input.items.forEach((item, idx) => {
      const rowHeight = 22;
      if (idx % 2 === 1) doc.rect(left, rowY, pageWidth, rowHeight).fill("#FFF8F0");
      doc
        .fillColor(INK)
        .font("Helvetica")
        .fontSize(8.5)
        .text(item.name, colItem + 8, rowY + 6, { width: colQty - colItem - 16 })
        .text(String(item.quantity), colQty, rowY + 6, { width: 50, align: "center" })
        .text(`Rs ${item.price}`, colPrice, rowY + 6, { width: 60, align: "right" })
        .font("Helvetica-Bold")
        .text(`Rs ${item.price * item.quantity}`, colTotal, rowY + 6, { width: 70, align: "right" });
      rowY += rowHeight;
    });
    doc.rect(left, tableTop, pageWidth, rowY - tableTop).lineWidth(1).strokeColor(BORDER).stroke();
    doc.y = rowY + 14;

    // Totals box (right-aligned)
    const boxWidth = 220;
    const boxX = left + pageWidth - boxWidth;
    let boxY = doc.y;
    const gstPercent = input.subtotal > 0 ? Math.round((input.gst / input.subtotal) * 100) : 0;
    const lines: [string, string, string?][] = [
      ["Subtotal", `Rs ${input.subtotal}`],
      [`GST (${gstPercent}%)`, `Rs ${input.gst}`],
      ["Shipping", input.deliveryCharge > 0 ? `Rs ${input.deliveryCharge}` : "FREE", input.deliveryCharge > 0 ? undefined : "#1B7A3D"],
    ];
    doc.rect(boxX, boxY, boxWidth, lines.length * 22 + 30).lineWidth(1).strokeColor(BORDER).stroke();
    lines.forEach(([label, value, color]) => {
      doc
        .fillColor(BROWN)
        .font("Helvetica")
        .fontSize(8.5)
        .text(label, boxX + 10, boxY + 7, { width: 100 })
        .fillColor(color ?? INK)
        .font("Helvetica-Bold")
        .text(value, boxX, boxY + 7, { width: boxWidth - 10, align: "right" });
      boxY += 22;
      doc.moveTo(boxX, boxY).lineTo(boxX + boxWidth, boxY).lineWidth(0.5).strokeColor(BORDER).stroke();
    });
    doc.rect(boxX, boxY, boxWidth, 28).fill(INK);
    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("GRAND TOTAL", boxX + 10, boxY + 8, { width: 100 })
      .fillColor(GOLD)
      .text(`Rs ${input.grandTotal}`, boxX, boxY + 8, { width: boxWidth - 10, align: "right" });

    // Payment details (left column, same row as totals box)
    if (input.payment) {
      doc
        .fillColor(INK)
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .text("PAYMENT", left, doc.y - lines.length * 22 - 30 + 10);
      doc
        .fillColor(BROWN)
        .font("Helvetica")
        .fontSize(8.5)
        .text(`Method: ${input.payment.method}`)
        .text(input.payment.reference ? `UTR / Ref: ${input.payment.reference}` : "");
    }

    doc.y = boxY + 28 + 30;
    doc.moveTo(left, doc.y).lineTo(left + pageWidth, doc.y).lineWidth(0.5).strokeColor(BORDER).stroke();
    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(7.5)
      .text(`Thank you for ordering from ${siteConfig.legalName}! This is a computer-generated invoice.`, left, doc.y + 8, {
        width: pageWidth,
        align: "center",
      });

    doc.end();
  });
}
