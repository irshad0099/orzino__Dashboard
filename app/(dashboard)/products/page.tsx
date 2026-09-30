"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pencil, Plus, X } from "lucide-react";
import { useApiData } from "@/app/lib/useApiData";
import { bulkUpdatePrices, listProducts, updateProduct, type AdminProduct } from "@/app/lib/services/products";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function ProductsPage() {
  const state = useApiData(listProducts, "products");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { price: string; stock: string }>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPercent, setBulkPercent] = useState("");
  const [adjustMrp, setAdjustMrp] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");

  const toggleOne = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = state.status === "ready" && state.data.length > 0 && state.data.every((p) => selected.has(p.id));
  const toggleAll = () => {
    if (state.status !== "ready") return;
    setSelected(allSelected ? new Set() : new Set(state.data.map((p) => p.id)));
  };

  const applyBulkPrice = async () => {
    const percent = Number(bulkPercent);
    if (!Number.isFinite(percent) || percent === 0 || selected.size === 0) return;
    setBulkBusy(true);
    setBulkMessage("");
    try {
      const result = await bulkUpdatePrices([...selected], percent, adjustMrp);
      setBulkMessage(
        `Updated ${result.updated} of ${result.total} product${result.total === 1 ? "" : "s"}.` +
          (result.notFound.length ? ` ${result.notFound.length} not found.` : "")
      );
      setSelected(new Set());
      setBulkPercent("");
      state.reload();
      setTimeout(() => setBulkMessage(""), 6000);
    } catch (err) {
      setBulkMessage(err instanceof Error ? err.message : "Couldn't update prices.");
      setTimeout(() => setBulkMessage(""), 6000);
    } finally {
      setBulkBusy(false);
    }
  };

  const draftFor = (p: AdminProduct) => drafts[p.id] ?? { price: String(p.price), stock: String(p.stock) };

  const setDraft = (p: AdminProduct, field: "price" | "stock", value: string) =>
    setDrafts((d) => ({
      ...d,
      [p.id]: { price: d[p.id]?.price ?? String(p.price), stock: d[p.id]?.stock ?? String(p.stock), [field]: value },
    }));

  const savePriceStock = async (p: AdminProduct) => {
    const d = draftFor(p);
    const price = Number(d.price);
    const stock = Number(d.stock);
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(stock) || stock < 0) return;
    if (price === p.price && stock === p.stock) return;
    setSavingId(p.id);
    try {
      await updateProduct(p.id, { price, stock });
      state.reload();
    } finally {
      setSavingId(null);
    }
  };

  const toggleComingSoon = async (p: AdminProduct) => {
    setSavingId(p.id);
    try {
      await updateProduct(p.id, { isComingSoon: !p.isComingSoon });
      state.reload();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-black uppercase text-[#181410]">Products</h1>
          <p className="text-sm text-[#5C3A1E] mt-1">Edit price, stock and availability — changes save instantly.</p>
        </div>
        <Link
          href="/products/new"
          className="flex items-center gap-1.5 text-xs font-black uppercase px-4 py-2.5 rounded-full bg-[#181410] text-[#FFC300] hover:bg-black"
        >
          <Plus size={14} />
          Add product
        </Link>
      </div>

      {state.status === "loading" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-white border border-[#EDD9C0] shimmer" />
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
          {state.data.length === 0 ? (
            <div className="bg-white border border-[#EDD9C0] rounded-2xl p-10 text-center text-sm text-[#8A8179]">
              No products yet.{" "}
              <code className="bg-[#F5E6D0] px-1.5 py-0.5 rounded">npm run seed-products</code> imports the
              storefront&apos;s current catalog.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#5C3A1E] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 accent-[#8B3A1A] cursor-pointer"
                  />
                  Select all
                </label>
              </div>

              {(selected.size > 0 || bulkMessage) && (
                <div className="flex flex-wrap items-center gap-2 mb-4 bg-[#181410] text-white rounded-2xl px-4 py-3">
                  {selected.size > 0 && (
                    <>
                      <span className="text-xs font-black uppercase text-[#FFC300]">{selected.size} selected</span>
                      <div className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-full px-3 py-1">
                        <input
                          type="number"
                          value={bulkPercent}
                          onChange={(e) => setBulkPercent(e.target.value)}
                          placeholder="e.g. 10 or -5"
                          className="w-24 bg-transparent text-xs font-bold focus:outline-none placeholder:text-white/40"
                        />
                        <span className="text-xs font-bold text-white/70">%</span>
                      </div>
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-white/70 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={adjustMrp}
                          onChange={(e) => setAdjustMrp(e.target.checked)}
                          className="w-3.5 h-3.5 accent-[#FFC300] cursor-pointer"
                        />
                        Also adjust MRP
                      </label>
                      <button
                        onClick={applyBulkPrice}
                        disabled={!bulkPercent || Number(bulkPercent) === 0 || bulkBusy}
                        className="text-xs font-black uppercase px-4 py-1.5 rounded-full bg-[#FFC300] text-[#181410] disabled:opacity-50 cursor-pointer"
                      >
                        {bulkBusy ? "Applying..." : "Apply"}
                      </button>
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

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {state.data.map((p) => {
                const d = draftFor(p);
                return (
                  <div key={p.id} className="bg-white border border-[#EDD9C0] rounded-2xl overflow-hidden">
                    <div className="relative aspect-[16/10] bg-[#F5EAD8]">
                      <Image src={p.image} alt={p.name} fill className="object-cover" unoptimized />
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleOne(p.id)}
                        aria-label={`Select ${p.name}`}
                        className="absolute top-2 left-2 w-4 h-4 accent-[#8B3A1A] cursor-pointer"
                      />
                      {p.isComingSoon && (
                        <span className="absolute top-2 left-8 bg-[#181410] text-white text-[9px] font-black uppercase px-2 py-1 rounded-full">
                          Coming soon
                        </span>
                      )}
                      <Link
                        href={`/products/${p.id}`}
                        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-white/90 hover:bg-white"
                      >
                        <Pencil size={13} className="text-[#181410]" />
                      </Link>
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] font-black uppercase tracking-wide text-[#B74418]">{p.category}</p>
                      <h3 className="text-sm font-black text-[#181410] leading-tight mt-0.5 mb-3 truncate">{p.name}</h3>

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <label className="block">
                          <span className="text-[9px] font-black uppercase text-[#8A8179]">Price</span>
                          <input
                            type="number"
                            value={d.price}
                            onChange={(e) => setDraft(p, "price", e.target.value)}
                            onBlur={() => savePriceStock(p)}
                            className="w-full border border-[#EDD9C0] rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-[#FFC300]"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[9px] font-black uppercase text-[#8A8179]">Stock cap</span>
                          <input
                            type="number"
                            value={d.stock}
                            onChange={(e) => setDraft(p, "stock", e.target.value)}
                            onBlur={() => savePriceStock(p)}
                            className="w-full border border-[#EDD9C0] rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-[#FFC300]"
                          />
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#8A8179]">
                          MRP <span className="line-through">{inr(p.originalPrice)}</span>
                        </span>
                        <button
                          onClick={() => toggleComingSoon(p)}
                          disabled={savingId === p.id}
                          className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full disabled:opacity-50 cursor-pointer ${
                            p.isComingSoon ? "bg-[#EDD9C0] text-[#5C3A1E]" : "bg-[#DFF3E4] text-[#1B7A3D]"
                          }`}
                        >
                          {p.isComingSoon ? "Mark live" : "Live"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
