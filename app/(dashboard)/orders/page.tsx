"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Download, PackageX, Printer, Search, X } from "lucide-react";
import { useApiData } from "@/app/lib/useApiData";
import { bulkUpdateStatus, exportOrdersUrl, labelsPdfUrl, listOrders } from "@/app/lib/services/orders";
import { ORDER_STATUS_LABEL, ORDER_STATUSES, type OrderStatus } from "@/app/lib/orders-shared";
import { STATUS_COLOR } from "@/app/lib/statusColors";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function OrdersPage() {
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [paymentStatus, setPaymentStatus] = useState<"" | "verification_pending" | "verified">("");
  const [hasRefundRequest, setHasRefundRequest] = useState(false);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTarget, setBulkTarget] = useState<OrderStatus | "">("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");

  // Deep link: /orders?q=9876543210 (e.g. "View their orders" on the Customers page).
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q")?.trim();
    if (!initial) return;
    const t = setTimeout(() => {
      setQInput(initial);
      setQ(initial);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const key = `orders-${status}-${paymentStatus}-${hasRefundRequest}-${q}-${page}`;
  const state = useApiData(() => listOrders({ status, paymentStatus, hasRefundRequest, q, page }), key);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  };

  const toggleOne = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allOnPageSelected = state.status === "ready" && state.data.orders.length > 0 && state.data.orders.every((o) => selected.has(o.id));
  const toggleAllOnPage = () => {
    if (state.status !== "ready") return;
    setSelected((s) => {
      const next = new Set(s);
      if (allOnPageSelected) state.data.orders.forEach((o) => next.delete(o.id));
      else state.data.orders.forEach((o) => next.add(o.id));
      return next;
    });
  };

  const applyBulk = async () => {
    if (!bulkTarget || selected.size === 0) return;
    setBulkBusy(true);
    setBulkMessage("");
    try {
      const result = await bulkUpdateStatus([...selected], bulkTarget);
      setBulkMessage(
        `Updated ${result.updated} of ${result.total}.` +
          (result.skipped.length ? ` ${result.skipped.length} skipped (invalid transition).` : "") +
          (result.notFound.length ? ` ${result.notFound.length} not found.` : "")
      );
      setSelected(new Set());
      setBulkTarget("");
      state.reload();
      setTimeout(() => setBulkMessage(""), 6000);
    } catch (err) {
      setBulkMessage(err instanceof Error ? err.message : "Couldn't update the selected orders.");
      setTimeout(() => setBulkMessage(""), 6000);
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <h1 className="text-2xl font-black uppercase text-[#181410]">Orders</h1>
        <a
          href={exportOrdersUrl({ status, paymentStatus, q })}
          className="flex items-center gap-1.5 text-xs font-black uppercase px-4 py-2 rounded-full bg-[#181410] text-[#FFC300] hover:bg-black"
        >
          <Download size={14} />
          Export CSV
        </a>
      </div>
      <p className="text-sm text-[#5C3A1E] mb-5">
        {state.status === "ready" ? `${state.data.total} order${state.data.total === 1 ? "" : "s"}` : " "}
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <form onSubmit={submitSearch} className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8179]" />
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search order id, name, phone, UTR..."
            className="w-full bg-white border border-[#EDD9C0] rounded-full pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-[#FFC300]"
          />
        </form>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus | "");
            setPage(1);
          }}
          className="bg-white border border-[#EDD9C0] rounded-full px-3 py-2 text-xs font-bold text-[#5C3A1E] focus:outline-none focus:border-[#FFC300]"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value as typeof paymentStatus);
            setPage(1);
          }}
          className="bg-white border border-[#EDD9C0] rounded-full px-3 py-2 text-xs font-bold text-[#5C3A1E] focus:outline-none focus:border-[#FFC300]"
        >
          <option value="">Any payment</option>
          <option value="verification_pending">Payment pending</option>
          <option value="verified">Payment verified</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setHasRefundRequest((v) => !v);
            setPage(1);
          }}
          aria-pressed={hasRefundRequest}
          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold border transition-colors cursor-pointer ${
            hasRefundRequest
              ? "bg-[#B00B44] border-[#B00B44] text-white"
              : "bg-white border-[#EDD9C0] text-[#5C3A1E] hover:bg-[#F5E6D0]"
          }`}
        >
          <PackageX size={13} />
          Refund requested
        </button>
      </div>

      {(selected.size > 0 || bulkMessage) && (
        <div className="flex flex-wrap items-center gap-2 mb-4 bg-[#181410] text-white rounded-2xl px-4 py-3">
          {selected.size > 0 && (
            <>
              <span className="text-xs font-black uppercase text-[#FFC300]">{selected.size} selected</span>
              <select
                value={bulkTarget}
                onChange={(e) => setBulkTarget(e.target.value as OrderStatus | "")}
                className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5 text-xs font-bold focus:outline-none"
              >
                <option value="">Set status to...</option>
                {/* "Shipped" needs a courier + tracking number per order, so it's set on each order's page. */}
                {ORDER_STATUSES.filter((s) => s !== "shipped").map((s) => (
                  <option key={s} value={s} className="text-[#181410]">
                    {ORDER_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <button
                onClick={applyBulk}
                disabled={!bulkTarget || bulkBusy}
                className="text-xs font-black uppercase px-4 py-1.5 rounded-full bg-[#FFC300] text-[#181410] disabled:opacity-50 cursor-pointer"
              >
                {bulkBusy ? "Applying..." : "Apply"}
              </button>
              <a
                href={labelsPdfUrl([...selected])}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-black uppercase px-4 py-1.5 rounded-full bg-white text-[#181410] hover:bg-[#F5E6D0]"
              >
                <Printer size={13} />
                Print labels
              </a>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs font-bold text-white/60 hover:text-white cursor-pointer ml-1"
              >
                Clear
              </button>
            </>
          )}
          {bulkMessage && (
            <span className="text-xs text-white/80 ml-auto flex items-center gap-2">
              {bulkMessage}
              <button
                onClick={() => setBulkMessage("")}
                aria-label="Dismiss"
                className="text-white/50 hover:text-white cursor-pointer"
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}

      {state.status === "loading" && (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-white border border-[#EDD9C0] shimmer" />
          ))}
        </div>
      )}

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
          {state.data.orders.length === 0 ? (
            <div className="bg-white border border-[#EDD9C0] rounded-2xl p-10 text-center text-sm text-[#8A8179]">
              No orders match these filters.
            </div>
          ) : (
            <div className="bg-white border border-[#EDD9C0] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-2 px-4 py-2.5 bg-[#181410] text-[#FFC300] text-[9px] font-black uppercase tracking-wide items-center">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleAllOnPage}
                  className="w-3.5 h-3.5 accent-[#FFC300] cursor-pointer"
                  aria-label="Select all on this page"
                />
                <span>Order</span>
                <span>Customer</span>
                <span className="text-right">Items</span>
                <span>Status</span>
                <span className="text-right">Total</span>
              </div>
              <div className="divide-y divide-[#EDD9C0]">
                {state.data.orders.map((o) => (
                  <div key={o.id} className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-2 items-center px-4 py-3 hover:bg-[#F5E6D0] transition-colors">
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      onChange={() => toggleOne(o.id)}
                      className="w-3.5 h-3.5 accent-[#8B3A1A] cursor-pointer"
                      aria-label={`Select ${o.id}`}
                    />
                    <Link href={`/orders/${o.id}`} className="min-w-0">
                      <p className="text-xs font-black text-[#181410] truncate flex items-center gap-1.5">
                        {o.id}
                        {o.hasRefundRequest && (
                          <span
                            title="Refund requested"
                            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#B00B44] text-white shrink-0"
                          >
                            <PackageX size={10} />
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-[#8A8179]">
                        {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    </Link>
                    <Link href={`/orders/${o.id}`} className="min-w-0">
                      <p className="text-xs font-bold text-[#181410] truncate">{o.customer.name}</p>
                      <p className="text-[10px] text-[#8A8179]">{o.customer.phone}</p>
                    </Link>
                    <Link href={`/orders/${o.id}`} className="text-xs font-bold text-[#5C3A1E] text-right">
                      {o.itemCount}
                    </Link>
                    <Link
                      href={`/orders/${o.id}`}
                      className="text-[9px] font-black uppercase px-2 py-1 rounded-full text-white text-center whitespace-nowrap"
                      style={{ background: STATUS_COLOR[o.status] }}
                    >
                      {ORDER_STATUS_LABEL[o.status]}
                    </Link>
                    <Link href={`/orders/${o.id}`} className="text-xs font-black text-[#181410] text-right whitespace-nowrap">
                      {inr(o.pricing.total)}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {state.data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-1.5 rounded-full bg-white border border-[#EDD9C0] text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-[#5C3A1E]">
                Page {state.data.page} of {state.data.totalPages}
              </span>
              <button
                disabled={page >= state.data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-1.5 rounded-full bg-white border border-[#EDD9C0] text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
