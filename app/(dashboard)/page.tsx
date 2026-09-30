"use client";
import React, { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Download, IndianRupee, Package, Printer, ShoppingBag, TrendingUp, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApiData } from "@/app/lib/useApiData";
import { analyticsExportUrl, getOverview } from "@/app/lib/services/analytics";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/app/lib/orders-shared";
import { STATUS_COLOR } from "@/app/lib/statusColors";

const RANGES = [
  { days: 7 as const, label: "7 days" },
  { days: 30 as const, label: "30 days" },
  { days: 90 as const, label: "90 days" },
];

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function OverviewPage() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const state = useApiData(() => getOverview(days), `overview-${days}`);

  return (
    <div className="p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black uppercase text-[#181410]">Overview</h1>
          <p className="text-sm text-[#5C3A1E] mt-1">Revenue, orders and what needs attention.</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <div className="flex bg-white border border-[#EDD9C0] rounded-full p-1">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wide transition-colors cursor-pointer ${
                  days === r.days ? "bg-[#181410] text-[#FFC300]" : "text-[#5C3A1E] hover:bg-[#F5E6D0]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <a
            href={analyticsExportUrl(days)}
            className="flex items-center gap-1.5 text-xs font-black uppercase px-4 py-2.5 rounded-full bg-[#181410] text-[#FFC300] hover:bg-black"
          >
            <Download size={14} />
            Export CSV
          </a>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs font-black uppercase px-4 py-2.5 rounded-full bg-white border border-[#EDD9C0] text-[#5C3A1E] hover:bg-[#F5E6D0] cursor-pointer"
          >
            <Printer size={14} />
            Print / PDF
          </button>
        </div>
      </div>

      {state.status === "loading" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-white border border-[#EDD9C0] shimmer" />
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <KpiCard icon={IndianRupee} label="Revenue" value={inr(state.data.summary.revenue)} />
            <KpiCard icon={ShoppingBag} label="Orders" value={String(state.data.summary.orders)} />
            <KpiCard icon={TrendingUp} label="Avg. order value" value={inr(state.data.summary.aov)} />
            <KpiCard
              icon={AlertTriangle}
              label="Pending payment"
              value={String(state.data.summary.pendingPayments)}
              alert={state.data.summary.pendingPayments > 0}
            />
          </div>

          {state.data.lowStockProducts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-6 bg-[#FFF6E0] border border-[#F2C94C] rounded-2xl px-4 py-3">
              <AlertTriangle size={16} className="text-[#B7791F] shrink-0" />
              <span className="text-xs font-black uppercase text-[#B7791F]">Low stock:</span>
              <div className="flex flex-wrap gap-1.5">
                {state.data.lowStockProducts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.id}`}
                    className="text-[11px] font-bold bg-white border border-[#F2C94C] rounded-full px-2.5 py-1 text-[#5C3A1E] hover:bg-[#FFF6E0]"
                  >
                    {p.name} ({p.weight}) — {p.stock} left
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 bg-white border border-[#EDD9C0] rounded-2xl p-5">
              <h2 className="text-xs font-black uppercase tracking-wide text-[#5C3A1E] mb-4">Revenue trend</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={state.data.revenueTrend} margin={{ left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDD9C0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortDate}
                      tick={{ fontSize: 10, fill: "#8A8179" }}
                      axisLine={{ stroke: "#EDD9C0" }}
                      tickLine={false}
                      minTickGap={24}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "#8A8179" }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip
                      formatter={(v) => inr(Number(v))}
                      labelFormatter={(label) => shortDate(String(label))}
                      contentStyle={{ borderRadius: 12, border: "1px solid #EDD9C0", fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#B74418" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-[#EDD9C0] rounded-2xl p-5">
              <h2 className="text-xs font-black uppercase tracking-wide text-[#5C3A1E] mb-4">Orders by status</h2>
              <div className="h-64 flex items-center justify-center">
                {state.data.statusBreakdown.every((s) => s.count === 0) ? (
                  <p className="text-xs text-[#8A8179]">No orders yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={state.data.statusBreakdown.filter((s) => s.count > 0)}
                        dataKey="count"
                        nameKey="status"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={2}
                      >
                        {state.data.statusBreakdown
                          .filter((s) => s.count > 0)
                          .map((s) => (
                            <Cell key={s.status} fill={STATUS_COLOR[s.status]} />
                          ))}
                      </Pie>
                      <Tooltip
                        formatter={(v, _n, p) => {
                          const s = (p as { payload?: { status?: OrderStatus } })?.payload?.status;
                          return [String(v), s ? ORDER_STATUS_LABEL[s] : ""];
                        }}
                        contentStyle={{ borderRadius: 12, border: "1px solid #EDD9C0", fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
                {state.data.statusBreakdown.map((s) => (
                  <div key={s.status} className="flex items-center gap-1.5 text-[10px] font-bold text-[#5C3A1E]">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLOR[s.status] }} />
                    {ORDER_STATUS_LABEL[s.status]} ({s.count})
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="bg-white border border-[#EDD9C0] rounded-2xl p-5">
              <h2 className="text-xs font-black uppercase tracking-wide text-[#5C3A1E] mb-4 flex items-center gap-1.5">
                <Package size={14} />
                Top products
              </h2>
              {state.data.topProducts.length === 0 ? (
                <p className="text-xs text-[#8A8179]">No sales in this range.</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={state.data.topProducts} layout="vertical" margin={{ left: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ fontSize: 10, fill: "#181410" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(v) => [`${v} units`, "Sold"]}
                        contentStyle={{ borderRadius: 12, border: "1px solid #EDD9C0", fontSize: 12 }}
                      />
                      <Bar dataKey="units" fill="#FFC300" radius={[0, 6, 6, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 bg-white border border-[#EDD9C0] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-black uppercase tracking-wide text-[#5C3A1E]">Recent orders</h2>
                <Link href="/orders" className="text-xs font-bold text-[#B74418] hover:underline">
                  View all
                </Link>
              </div>
              {state.data.recentOrders.length === 0 ? (
                <p className="text-xs text-[#8A8179]">No orders yet.</p>
              ) : (
                <div className="space-y-2">
                  {state.data.recentOrders.map((o) => (
                    <Link
                      key={o.id}
                      href={`/orders/${o.id}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-[#F5E6D0] transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-black text-[#181410] truncate">{o.id}</p>
                        <p className="text-[11px] text-[#8A8179] truncate">{o.customer.name}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className="text-[9px] font-black uppercase px-2 py-1 rounded-full text-white"
                          style={{ background: STATUS_COLOR[o.status] }}
                        >
                          {ORDER_STATUS_LABEL[o.status]}
                        </span>
                        <span className="text-xs font-black text-[#181410] w-16 text-right">
                          {inr(o.pricing.total)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4 mt-4">
            <div className="lg:col-span-2 bg-white border border-[#EDD9C0] rounded-2xl p-5">
              <h2 className="text-xs font-black uppercase tracking-wide text-[#5C3A1E] mb-4 flex items-center gap-1.5">
                <Users size={14} />
                Top spenders
              </h2>
              {state.data.customerInsights.topSpenders.length === 0 ? (
                <p className="text-xs text-[#8A8179]">No customers in this range.</p>
              ) : (
                <div className="space-y-2">
                  {state.data.customerInsights.topSpenders.map((c) => (
                    <div key={c.phone} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F5E6D0]/40">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-[#181410] truncate">{c.name || "Unknown"}</p>
                        <p className="text-[11px] text-[#8A8179]">
                          {c.phone} · {c.orders} order{c.orders === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="text-xs font-black text-[#181410] shrink-0">{inr(c.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-[#EDD9C0] rounded-2xl p-5">
              <h2 className="text-xs font-black uppercase tracking-wide text-[#5C3A1E] mb-4">Repeat customers</h2>
              <p className="text-3xl font-black text-[#181410]">{state.data.customerInsights.repeatRate}%</p>
              <p className="text-xs text-[#8A8179] mt-1">
                {state.data.customerInsights.repeatCustomers} of {state.data.customerInsights.totalCustomers} customers
                ordered more than once in this range.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  alert,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`bg-white border rounded-2xl p-4 ${alert ? "border-[#E8115B]" : "border-[#EDD9C0]"}`}
    >
      <div className="flex items-center gap-1.5 text-[#8A8179]">
        <Icon size={13} className={alert ? "text-[#E8115B]" : undefined} />
        <p className="text-[10px] font-black uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-xl font-black mt-1 ${alert ? "text-[#E8115B]" : "text-[#181410]"}`}>{value}</p>
    </div>
  );
}
