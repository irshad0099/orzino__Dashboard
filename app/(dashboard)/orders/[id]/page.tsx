"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, CircleCheck, Clock, FileText, MapPin, PackageX, Phone, Printer, Save, ShieldCheck, Tag, Truck, X } from "lucide-react";
import { useApiData } from "@/app/lib/useApiData";
import {
  getOrder,
  invoicePdfUrl,
  labelsPdfUrl,
  resolveRefundRequest,
  updateOrderNote,
  updateOrderPayment,
  updateOrderStatus,
  type ShipmentInput,
} from "@/app/lib/services/orders";
import {
  ORDER_STATUS_LABEL,
  NEXT_STATUSES,
  NEXT_REFUND_STATUSES,
  REFUND_PREFERENCE_LABEL,
  REFUND_REASON_LABEL,
  REFUND_STATUS_LABEL,
  type AdminOrder,
  type OrderStatus,
  type RefundStatus,
} from "@/app/lib/orders-shared";
import { STATUS_COLOR } from "@/app/lib/statusColors";

const REFUND_STATUS_COLOR: Record<RefundStatus, string> = {
  requested: "#92670A",
  approved: "#1B7A3D",
  rejected: "#B00B44",
  refunded: "#1B7A3D",
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const state = useApiData(() => getOrder(params.id), `order-${params.id}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [shipFormOpen, setShipFormOpen] = useState(false);

  const setStatus = async (status: OrderStatus, shipment?: ShipmentInput) => {
    // Shipping needs the courier + tracking number first (it goes into the customer's email).
    if (status === "shipped" && !shipment) {
      setShipFormOpen(true);
      return;
    }
    setActionError("");
    setBusy(true);
    try {
      await updateOrderStatus(params.id, status, undefined, shipment);
      setShipFormOpen(false);
      state.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't update the status.");
    } finally {
      setBusy(false);
    }
  };

  const verifyPayment = async () => {
    setActionError("");
    setBusy(true);
    try {
      await updateOrderPayment(params.id, "verified");
      state.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't update the payment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-5 sm:p-8 max-w-4xl">
      <Link href="/orders" className="inline-flex items-center gap-1 text-xs font-bold text-[#5C3A1E] hover:text-[#181410] mb-4">
        <ChevronLeft size={14} />
        All orders
      </Link>

      {state.status === "loading" && <div className="h-40 rounded-2xl bg-white border border-[#EDD9C0] shimmer" />}

      {state.status === "error" && (
        <div className="bg-[#FDE8EF] text-[#B00B44] text-sm font-bold rounded-2xl p-6 flex items-center justify-between">
          <span>{state.message}</span>
          <button onClick={state.reload} className="underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {state.status === "ready" && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl font-black text-[#181410]">{state.data.id}</h1>
              <p className="text-xs text-[#8A8179] mt-0.5">
                Invoice {state.data.invoiceNumber} &middot; {fmt(state.data.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={invoicePdfUrl(state.data.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-black uppercase px-3 py-1.5 rounded-full border border-[#D4B896] bg-white text-[#5C3A1E] hover:bg-[#F5E6D0]"
              >
                <FileText size={13} />
                Invoice PDF
              </a>
              <a
                href={labelsPdfUrl([state.data.id])}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-black uppercase px-3 py-1.5 rounded-full border border-[#D4B896] bg-white text-[#5C3A1E] hover:bg-[#F5E6D0]"
              >
                <Printer size={13} />
                Shipping label
              </a>
              <span
                className="text-[10px] font-black uppercase px-3 py-1.5 rounded-full text-white"
                style={{ background: STATUS_COLOR[state.data.status] }}
              >
                {ORDER_STATUS_LABEL[state.data.status]}
              </span>
            </div>
          </div>

          {actionError && (
            <div className="bg-[#FDE8EF] text-[#B00B44] text-xs font-bold rounded-xl p-3 mb-4">{actionError}</div>
          )}

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white border border-[#EDD9C0] rounded-2xl p-5">
              <h2 className="text-[10px] font-black uppercase tracking-wide text-[#5C3A1E] mb-3">Customer</h2>
              <p className="text-sm font-bold text-[#181410]">{state.data.customer.name}</p>
              <p className="text-xs text-[#5C3A1E] flex items-center gap-1.5 mt-1">
                <Phone size={12} />
                {state.data.customer.phone}
              </p>
              {state.data.customer.email && <p className="text-xs text-[#5C3A1E] mt-1">{state.data.customer.email}</p>}
              <p className="text-xs text-[#5C3A1E] flex items-start gap-1.5 mt-2">
                <MapPin size={12} className="shrink-0 mt-0.5" />
                {state.data.customer.address}
              </p>
            </div>

            <div className="bg-white border border-[#EDD9C0] rounded-2xl p-5">
              <h2 className="text-[10px] font-black uppercase tracking-wide text-[#5C3A1E] mb-3">Payment</h2>
              <p className="text-xs text-[#5C3A1E]">
                {state.data.payment.method === "COD" ? (
                  <>Cash on Delivery &middot; ₹{state.data.pricing.total} due at delivery</>
                ) : (
                  <>
                    UPI &middot; <span className="font-mono">{state.data.payment.utr}</span>
                  </>
                )}
              </p>
              <div className="flex items-center justify-between mt-3">
                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                    state.data.payment.status === "verified"
                      ? "bg-[#DFF3E4] text-[#1B7A3D]"
                      : "bg-[#FDE8EF] text-[#B00B44]"
                  }`}
                >
                  {state.data.payment.method === "COD"
                    ? state.data.payment.status === "verified"
                      ? "Collected"
                      : "Pay on delivery"
                    : state.data.payment.status === "verified"
                    ? "Verified"
                    : "Verification pending"}
                </span>
                {state.data.payment.status !== "verified" && (
                  <button
                    onClick={verifyPayment}
                    disabled={busy}
                    className="flex items-center gap-1.5 text-xs font-black text-white bg-[#1B7A3D] hover:bg-[#166030] px-3 py-1.5 rounded-full disabled:opacity-50 cursor-pointer"
                  >
                    <ShieldCheck size={13} />
                    {state.data.payment.method === "COD" ? "Mark cash collected" : "Mark verified"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#EDD9C0] rounded-2xl p-5 mb-4">
            <h2 className="text-[10px] font-black uppercase tracking-wide text-[#5C3A1E] mb-3">Update status</h2>
            {NEXT_STATUSES[state.data.status].length === 0 ? (
              <p className="text-xs text-[#8A8179]">This order is in a final state.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {NEXT_STATUSES[state.data.status].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    disabled={busy}
                    className={`text-xs font-black uppercase px-4 py-2 rounded-full text-white disabled:opacity-50 cursor-pointer ${
                      s === "cancelled" ? "" : ""
                    }`}
                    style={{ background: STATUS_COLOR[s] }}
                  >
                    Mark {ORDER_STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            )}
            {shipFormOpen && (
              <ShipmentForm
                busy={busy}
                initial={state.data.shipment}
                onCancel={() => setShipFormOpen(false)}
                onSubmit={(shipment) => setStatus("shipped", shipment)}
              />
            )}
          </div>

          {state.data.shipment && (
            <div className="bg-white border border-[#EDD9C0] rounded-2xl p-5 mb-4">
              <h2 className="text-[10px] font-black uppercase tracking-wide text-[#5C3A1E] mb-3 flex items-center gap-1.5">
                <Truck size={12} />
                Shipment
              </h2>
              <p className="text-xs text-[#5C3A1E]">
                <strong className="text-[#181410]">{state.data.shipment.courier}</strong> &middot; AWB{" "}
                <span className="font-mono font-bold text-[#181410]">{state.data.shipment.trackingNumber}</span> &middot;
                shipped {fmt(state.data.shipment.shippedAt)}
              </p>
              {state.data.shipment.trackingUrl && (
                <a
                  href={state.data.shipment.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1 text-xs font-bold text-[#1B7A3D] hover:underline break-all"
                >
                  {state.data.shipment.trackingUrl}
                </a>
              )}
              {state.data.status === "shipped" && !shipFormOpen && (
                <button
                  onClick={() => setShipFormOpen(true)}
                  className="block mt-2 text-[11px] font-bold text-[#5C3A1E] underline cursor-pointer"
                >
                  Edit tracking details
                </button>
              )}
            </div>
          )}

          {state.data.refundRequest && (
            <RefundCard orderId={state.data.id} refundRequest={state.data.refundRequest} onResolved={state.reload} />
          )}

          <NotesCard orderId={state.data.id} initialNote={state.data.adminNote} initialTags={state.data.tags} />

          <div className="bg-white border border-[#EDD9C0] rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2.5 bg-[#181410] text-[#FFC300] text-[9px] font-black uppercase tracking-wide">
              <span>Item</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Price</span>
              <span className="text-right">Total</span>
            </div>
            <div className="divide-y divide-[#EDD9C0]">
              {state.data.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-3 items-center">
                  <span className="text-xs font-bold text-[#181410]">{item.name}</span>
                  <span className="text-xs text-[#5C3A1E] text-right">{item.quantity}</span>
                  <span className="text-xs text-[#5C3A1E] text-right">{inr(item.price)}</span>
                  <span className="text-xs font-black text-[#181410] text-right">{inr(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-[#EDD9C0] space-y-1 text-xs">
              <div className="flex justify-between text-[#5C3A1E]">
                <span>Subtotal</span>
                <span>{inr(state.data.pricing.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#5C3A1E]">
                <span>GST</span>
                <span>{inr(state.data.pricing.gst)}</span>
              </div>
              <div className="flex justify-between text-[#5C3A1E]">
                <span>Delivery</span>
                <span>{state.data.pricing.delivery ? inr(state.data.pricing.delivery) : "Free"}</span>
              </div>
              <div className="flex justify-between font-black text-[#181410] text-sm pt-1">
                <span>Total</span>
                <span>{inr(state.data.pricing.total)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#EDD9C0] rounded-2xl p-5">
            <h2 className="text-[10px] font-black uppercase tracking-wide text-[#5C3A1E] mb-3">History</h2>
            <div className="space-y-3">
              {[...state.data.statusHistory].reverse().map((h, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  {i === 0 ? (
                    <CircleCheck size={15} className="text-[#1B7A3D] shrink-0 mt-0.5" />
                  ) : (
                    <Clock size={15} className="text-[#8A8179] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-[#181410]">{ORDER_STATUS_LABEL[h.status]}</p>
                    <p className="text-[10px] text-[#8A8179]">{fmt(h.at)}</p>
                    {h.note && <p className="text-[11px] text-[#5C3A1E] mt-0.5">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ShipmentForm({
  busy,
  initial,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  initial?: ShipmentInput;
  onCancel: () => void;
  onSubmit: (shipment: ShipmentInput) => void;
}) {
  const [courier, setCourier] = useState(initial?.courier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(initial?.trackingNumber ?? "");
  const [trackingUrl, setTrackingUrl] = useState(initial?.trackingUrl ?? "");
  const input = "w-full text-xs border border-[#EDD9C0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#FFC300] bg-white";
  const valid = courier.trim().length >= 2 && trackingNumber.trim().length >= 3;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) {
          onSubmit({ courier: courier.trim(), trackingNumber: trackingNumber.trim(), trackingUrl: trackingUrl.trim() });
        }
      }}
      className="mt-3 bg-[#FFFBEA] border border-[#FFC300]/50 rounded-xl p-3 space-y-2"
    >
      <p className="text-[10px] font-black uppercase text-[#5C3A1E]">
        Dispatch details — the customer gets these by email
      </p>
      <input
        value={courier}
        onChange={(e) => setCourier(e.target.value)}
        placeholder="Courier (e.g. Delhivery, Shiprocket, India Post)"
        list="courier-options"
        className={input}
        required
      />
      <datalist id="courier-options">
        {["Delhivery", "Shiprocket", "Blue Dart", "DTDC", "Xpressbees", "Ecom Express", "India Post"].map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <input
        value={trackingNumber}
        onChange={(e) => setTrackingNumber(e.target.value)}
        placeholder="Tracking / AWB number"
        className={`${input} font-mono`}
        required
      />
      <input
        value={trackingUrl}
        onChange={(e) => setTrackingUrl(e.target.value)}
        placeholder="Tracking link (optional) — https://..."
        type="url"
        className={input}
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!valid || busy}
          className="flex items-center gap-1.5 text-xs font-black uppercase px-4 py-1.5 rounded-full bg-[#181410] text-[#FFC300] disabled:opacity-50 cursor-pointer"
        >
          <Truck size={12} />
          {busy ? "Saving..." : initial ? "Save tracking" : "Mark shipped & email customer"}
        </button>
        <button type="button" onClick={onCancel} className="text-xs font-bold text-[#5C3A1E] hover:text-[#181410] cursor-pointer">
          Cancel
        </button>
      </div>
    </form>
  );
}

function RefundCard({
  orderId,
  refundRequest,
  onResolved,
}: {
  orderId: string;
  refundRequest: AdminOrder["refundRequest"];
  onResolved: () => void;
}) {
  const [pendingAction, setPendingAction] = useState<RefundStatus | null>(null);
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!refundRequest) return null;
  const allowed = NEXT_REFUND_STATUSES[refundRequest.status];

  const confirm = async (target: RefundStatus) => {
    setError("");
    setBusy(true);
    try {
      await resolveRefundRequest(orderId, {
        status: target,
        resolutionNote: note.trim() || undefined,
        refundReference: reference.trim() || undefined,
      });
      setPendingAction(null);
      setNote("");
      setReference("");
      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the refund request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border-2 border-[#EDD9C0] rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-[10px] font-black uppercase tracking-wide text-[#5C3A1E] flex items-center gap-1.5">
          <PackageX size={12} />
          Refund / replacement request
        </h2>
        <span
          className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full text-white"
          style={{ background: REFUND_STATUS_COLOR[refundRequest.status] }}
        >
          {REFUND_STATUS_LABEL[refundRequest.status]}
        </span>
      </div>

      <dl className="text-xs space-y-1.5 mb-3">
        <div className="flex justify-between gap-3">
          <dt className="text-[#5C3A1E]">Reason</dt>
          <dd className="font-bold">{REFUND_REASON_LABEL[refundRequest.reason]}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[#5C3A1E]">Preference</dt>
          <dd className="font-bold">{REFUND_PREFERENCE_LABEL[refundRequest.preference]}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[#5C3A1E]">Requested</dt>
          <dd className="font-bold">{fmt(refundRequest.requestedAt)}</dd>
        </div>
      </dl>
      <p className="text-xs text-[#3D2B1F] bg-[#F5E6D0] rounded-xl p-3 mb-3">{refundRequest.description}</p>

      {refundRequest.resolutionNote && (
        <p className="text-xs text-[#5C3A1E] mb-2">
          <strong className="text-[#181410]">Note to customer:</strong> {refundRequest.resolutionNote}
        </p>
      )}
      {refundRequest.refundReference && (
        <p className="text-xs text-[#5C3A1E] mb-2">
          <strong className="text-[#181410]">Reference:</strong>{" "}
          <span className="font-mono">{refundRequest.refundReference}</span>
        </p>
      )}

      {error && <div className="bg-[#FDE8EF] text-[#B00B44] text-xs font-bold rounded-xl p-3 mb-3">{error}</div>}

      {allowed.length > 0 && (
        <>
          {!pendingAction ? (
            <div className="flex flex-wrap gap-2">
              {allowed.includes("approved") && (
                <button
                  onClick={() => setPendingAction("approved")}
                  className="text-xs font-black uppercase px-4 py-2 rounded-full bg-[#1B7A3D] text-white hover:bg-[#166030] cursor-pointer"
                >
                  Approve
                </button>
              )}
              {allowed.includes("refunded") && (
                <button
                  onClick={() => setPendingAction("refunded")}
                  className="text-xs font-black uppercase px-4 py-2 rounded-full bg-[#8B3A1A] text-white hover:bg-[#7A2E12] cursor-pointer"
                >
                  Mark refunded
                </button>
              )}
              {allowed.includes("rejected") && (
                <button
                  onClick={() => setPendingAction("rejected")}
                  className="text-xs font-black uppercase px-4 py-2 rounded-full bg-[#B00B44] text-white hover:bg-[#92083a] cursor-pointer"
                >
                  Reject
                </button>
              )}
            </div>
          ) : (
            <div className="bg-[#FFFBEA] border border-[#FFC300]/50 rounded-xl p-3">
              <p className="text-[10px] font-black uppercase text-[#5C3A1E] mb-2">
                {pendingAction === "approved" && "Approve this request"}
                {pendingAction === "rejected" && "Reject this request"}
                {pendingAction === "refunded" && "Mark as refunded"}
              </p>
              {pendingAction === "refunded" && (
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="UPI / bank refund reference number"
                  className="w-full text-xs border border-[#EDD9C0] rounded-lg px-3 py-2 mb-2 focus:outline-none focus:border-[#FFC300]"
                />
              )}
              {(pendingAction === "rejected" || pendingAction === "refunded" || pendingAction === "approved") && (
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    pendingAction === "rejected"
                      ? "Why? The customer will see this."
                      : "Optional note the customer will see"
                  }
                  rows={2}
                  className="w-full text-xs border border-[#EDD9C0] rounded-lg px-3 py-2 mb-2 resize-none focus:outline-none focus:border-[#FFC300]"
                />
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => confirm(pendingAction)}
                  disabled={busy}
                  className="text-xs font-black uppercase px-4 py-1.5 rounded-full bg-[#181410] text-[#FFC300] disabled:opacity-50 cursor-pointer"
                >
                  {busy ? "Saving..." : "Confirm"}
                </button>
                <button
                  onClick={() => {
                    setPendingAction(null);
                    setError("");
                  }}
                  className="text-xs font-bold text-[#5C3A1E] hover:text-[#181410] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NotesCard({
  orderId,
  initialNote,
  initialTags,
}: {
  orderId: string;
  initialNote: string;
  initialTags: string[];
}) {
  const [note, setNote] = useState(initialNote);
  const [tags, setTags] = useState(initialTags);
  // The last-saved snapshot, used to detect unsaved edits. Updated locally on save
  // instead of via a parent reload, so saving a note doesn't flash the whole page.
  const [savedNote, setSavedNote] = useState(initialNote);
  const [savedTags, setSavedTags] = useState(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = note !== savedNote || JSON.stringify(tags) !== JSON.stringify(savedTags);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 10) setTags([...tags, t]);
    setTagInput("");
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateOrderNote(orderId, { adminNote: note, tags });
      setSavedNote(note);
      setSavedTags(tags);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-[#EDD9C0] rounded-2xl p-5 mb-4">
      <h2 className="text-[10px] font-black uppercase tracking-wide text-[#5C3A1E] mb-3 flex items-center gap-1.5">
        <Tag size={12} />
        Internal notes &amp; tags
      </h2>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((t) => (
          <span
            key={t}
            className="flex items-center gap-1 bg-[#F5E6D0] text-[#5C3A1E] text-[10px] font-bold px-2.5 py-1 rounded-full"
          >
            {t}
            <button onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:text-[#B00B44] cursor-pointer">
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          onBlur={addTag}
          placeholder={tags.length === 0 ? "Add a tag, e.g. VIP, Recheck address" : "Add another..."}
          className="text-[10px] px-2 py-1 border border-dashed border-[#D4B896] rounded-full focus:outline-none focus:border-[#FFC300] w-40"
        />
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Customer called, confirmed address. Deliver after 6pm."
        rows={2}
        maxLength={500}
        className="w-full text-xs border border-[#EDD9C0] rounded-xl px-3 py-2 focus:outline-none focus:border-[#FFC300] resize-none"
      />

      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="flex items-center gap-1.5 text-xs font-black uppercase px-4 py-1.5 rounded-full bg-[#8B3A1A] text-white hover:bg-[#7A2E12] disabled:opacity-50 cursor-pointer"
        >
          <Save size={12} />
          {saving ? "Saving..." : "Save note"}
        </button>
        {saved && <span className="text-[11px] font-bold text-[#1B7A3D]">Saved</span>}
      </div>
    </div>
  );
}
