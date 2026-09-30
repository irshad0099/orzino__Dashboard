"use client";
import React, { useState } from "react";
import { Info, MapPin } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApiData } from "@/app/lib/useApiData";
import { getGeo } from "@/app/lib/services/analytics";

const RANGES = [
  { days: 30 as const, label: "30 days" },
  { days: 90 as const, label: "90 days" },
  { days: 365 as const, label: "1 year" },
];

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function HeatmapPage() {
  const [days, setDays] = useState<30 | 90 | 365>(90);
  const state = useApiData(() => getGeo(days), `geo-${days}`);

  return (
    <div className="p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-black uppercase text-[#181410]">Heatmap</h1>
          <p className="text-sm text-[#5C3A1E] mt-1">Where orders are coming from.</p>
        </div>
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
      </div>

      <div className="bg-[#FFF3D6] border border-[#F0DDA0] rounded-2xl p-3.5 mb-5 flex items-start gap-2.5">
        <Info size={15} className="text-[#8B6B00] shrink-0 mt-0.5" />
        <p className="text-xs text-[#6B5300] leading-relaxed">
          City is guessed from the free-text delivery address (no dedicated city field exists yet). For an accurate,
          map-based heatmap, add a required &quot;City&quot; dropdown at checkout &mdash; see the PRD, Section 7,
          Option A.
        </p>
      </div>

      {state.status === "loading" && <div className="h-80 rounded-2xl bg-white border border-[#EDD9C0] shimmer" />}

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
          {state.data.cities.length === 0 ? (
            <div className="bg-white border border-[#EDD9C0] rounded-2xl p-10 text-center text-sm text-[#8A8179]">
              No orders in this range.
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-white border border-[#EDD9C0] rounded-2xl p-5">
                <h2 className="text-xs font-black uppercase tracking-wide text-[#5C3A1E] mb-4">Orders by city</h2>
                <div style={{ height: Math.max(240, state.data.cities.length * 34) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={state.data.cities} layout="vertical" margin={{ left: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="city"
                        width={100}
                        tick={{ fontSize: 10, fill: "#181410" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(v) => [`${v} orders`, "Orders"]}
                        contentStyle={{ borderRadius: 12, border: "1px solid #EDD9C0", fontSize: 12 }}
                      />
                      <Bar dataKey="orders" fill="#B74418" radius={[0, 6, 6, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-[#EDD9C0] rounded-2xl overflow-hidden h-fit">
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-2.5 bg-[#181410] text-[#FFC300] text-[9px] font-black uppercase tracking-wide">
                  <span>City</span>
                  <span className="text-right">Orders</span>
                  <span className="text-right">Revenue</span>
                </div>
                <div className="divide-y divide-[#EDD9C0]">
                  {state.data.cities.map((c) => (
                    <div key={c.city} className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-2.5 items-center">
                      <span className="text-xs font-bold text-[#181410] flex items-center gap-1.5">
                        <MapPin size={12} className="text-[#B74418] shrink-0" />
                        {c.city}
                      </span>
                      <span className="text-xs text-[#5C3A1E] text-right">{c.orders}</span>
                      <span className="text-xs font-black text-[#181410] text-right">{inr(c.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
