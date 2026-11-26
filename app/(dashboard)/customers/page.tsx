"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Download, Mail, MapPin, Phone, Search, Users } from "lucide-react";
import { useApiData } from "@/app/lib/useApiData";
import { exportCustomersUrl, listCustomers } from "@/app/lib/services/customers";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  // Debounce the search box so we don't query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const state = useApiData(() => listCustomers({ page, q }), `customers-${page}-${q}`);

  return (
    <div className="p-5 sm:p-8 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-black uppercase text-[#181410]">Customers</h1>
          <p className="text-sm text-[#5C3A1E] mt-1">Everyone who created an account on orzino.com.</p>
        </div>
        <a
          href={exportCustomersUrl(q)}
          className="flex items-center gap-1.5 text-xs font-black uppercase px-4 py-2 rounded-full bg-[#181410] text-[#FFC300] hover:opacity-90"
        >
          <Download size={13} />
          Export CSV
        </a>
      </div>

      {state.status === "ready" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          <Stat label="Registered customers" value={String(state.data.totalAll)} />
          <Stat label="Joined this week" value={String(state.data.newThisWeek)} />
          {q && <Stat label="Matching search" value={String(state.data.total)} />}
        </div>
      )}

      <label className="relative block mb-4 max-w-md">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8179]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email or phone"
          className="w-full text-sm bg-white border border-[#EDD9C0] rounded-full pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#FFC300]"
        />
      </label>

      {state.status === "loading" && <div className="h-60 rounded-2xl bg-white border border-[#EDD9C0] shimmer" />}

      {state.status === "error" && (
        <div className="bg-[#FDE8EF] text-[#B00B44] text-sm font-bold rounded-2xl p-6 flex items-center justify-between">
          <span>{state.message}</span>
          <button onClick={state.reload} className="underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {state.status === "ready" && state.data.customers.length === 0 && (
        <div className="bg-white border border-[#EDD9C0] rounded-2xl p-10 text-center text-[#8A8179]">
          <Users size={28} className="mx-auto mb-2" />
          <p className="text-sm font-bold">{q ? "No customers match that search." : "No customer accounts yet."}</p>
        </div>
      )}

      {state.status === "ready" && state.data.customers.length > 0 && (
        <>
          <div className="bg-white border border-[#EDD9C0] rounded-2xl overflow-hidden">
            <div className="hidden md:grid grid-cols-[1.4fr_1.6fr_1fr_0.6fr_0.8fr_0.9fr_24px] gap-3 px-4 py-2.5 bg-[#181410] text-[#FFC300] text-[9px] font-black uppercase tracking-wide">
              <span>Name</span>
              <span>Email</span>
              <span>Phone</span>
              <span className="text-right">Orders</span>
              <span className="text-right">Spent</span>
              <span className="text-right">Joined</span>
              <span />
            </div>
            <div className="divide-y divide-[#EDD9C0]">
              {state.data.customers.map((c) => {
                const open = openId === c.id;
                return (
                  <div key={c.id}>
                    <button
                      onClick={() => setOpenId(open ? null : c.id)}
                      className="w-full text-left grid grid-cols-2 md:grid-cols-[1.4fr_1.6fr_1fr_0.6fr_0.8fr_0.9fr_24px] gap-x-3 gap-y-1 px-4 py-3 items-center hover:bg-[#FFF8F0] cursor-pointer"
                    >
                      <span className="text-sm font-bold text-[#181410] truncate">{c.name}</span>
                      <span className="text-xs text-[#5C3A1E] truncate">{c.email}</span>
                      <span className="text-xs text-[#5C3A1E] font-mono">{c.phone}</span>
                      <span className="text-xs text-[#181410] md:text-right">{c.orders} orders</span>
                      <span className="text-xs font-black text-[#181410] md:text-right">{inr(c.totalSpent)}</span>
                      <span className="text-[11px] text-[#8A8179] md:text-right">{fmt(c.joinedAt)}</span>
                      <ChevronDown
                        size={14}
                        className={`hidden md:block text-[#8A8179] transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    {open && (
                      <div className="px-4 pb-4 pt-1 bg-[#FFF8F0] grid sm:grid-cols-2 gap-4 text-xs text-[#5C3A1E]">
                        <div className="space-y-1.5">
                          <p className="flex items-center gap-1.5">
                            <Mail size={12} />
                            <a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Phone size={12} />
                            <a href={`tel:+91${c.phone}`} className="hover:underline">{c.phone}</a>
                          </p>
                          <p>Last order: {c.lastOrderAt ? fmt(c.lastOrderAt) : "—"}</p>
                          {c.orders > 0 && (
                            <Link
                              href={`/orders?q=${encodeURIComponent(c.phone)}`}
                              className="inline-block font-black uppercase text-[11px] text-[#8B3A1A] hover:underline"
                            >
                              View their orders →
                            </Link>
                          )}
                        </div>
                        <div>
                          <p className="font-black uppercase text-[10px] tracking-wide mb-1.5">
                            Saved addresses ({c.addresses.length})
                          </p>
                          {c.addresses.length === 0 && <p className="text-[#8A8179]">None saved.</p>}
                          <ul className="space-y-2">
                            {c.addresses.map((a, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <MapPin size={12} className="shrink-0 mt-0.5" />
                                <span>
                                  <strong className="text-[#181410]">{a.label}</strong>
                                  {a.isDefault && <span className="ml-1 text-[#1B7A3D] font-bold">(default)</span>}
                                  <br />
                                  {a.name} · {a.phone}
                                  <br />
                                  {a.address}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {state.data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-xs font-bold text-[#5C3A1E]">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 rounded-full border border-[#D4B896] bg-white disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span>
                Page {state.data.page} of {state.data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(state.data.totalPages, p + 1))}
                disabled={page >= state.data.totalPages}
                className="px-4 py-2 rounded-full border border-[#D4B896] bg-white disabled:opacity-40 cursor-pointer"
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-[#EDD9C0] rounded-2xl p-4">
      <p className="text-[10px] font-black uppercase tracking-wide text-[#8A8179]">{label}</p>
      <p className="text-2xl font-black text-[#181410] mt-1">{value}</p>
    </div>
  );
}
