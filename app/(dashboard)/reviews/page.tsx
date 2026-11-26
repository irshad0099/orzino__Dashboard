"use client";
import React, { useState } from "react";
import { BadgeCheck, Eye, EyeOff, Play, Star, X } from "lucide-react";
import { useApiData } from "@/app/lib/useApiData";
import { listReviews, setReviewStatus, type AdminReview } from "@/app/lib/services/reviews";
import { business } from "@/app/lib/business";

const STOREFRONT = `https://${business.siteUrl}`;
const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

function StarsRow({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={13} className={n <= value ? "text-[#F5A300]" : "text-[#E3D3BC]"} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const [status, setStatus] = useState<"" | "published" | "hidden">("");
  const [rating, setRating] = useState(0);
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<AdminReview["media"][number] | null>(null);
  const [error, setError] = useState("");

  const state = useApiData(() => listReviews({ status, rating, page }), `reviews-${status}-${rating}-${page}`);

  const toggle = async (r: AdminReview) => {
    setBusyId(r.id);
    setError("");
    try {
      await setReviewStatus(r.id, r.status === "published" ? "hidden" : "published");
      state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the review.");
    } finally {
      setBusyId(null);
    }
  };

  const chip = (active: boolean) =>
    `text-xs font-black uppercase px-3.5 py-1.5 rounded-full border cursor-pointer ${
      active ? "bg-[#181410] text-[#FFC300] border-[#181410]" : "bg-white text-[#5C3A1E] border-[#D4B896] hover:bg-[#F5E6D0]"
    }`;

  return (
    <div className="p-5 sm:p-8 max-w-5xl">
      <h1 className="text-2xl font-black uppercase text-[#181410]">Reviews</h1>
      <p className="text-sm text-[#5C3A1E] mt-1">
        Verified-buyer reviews from the store. They go live straight away — hide anything inappropriate; the product&apos;s
        rating updates instantly.
      </p>

      <div className="flex flex-wrap items-center gap-2 mt-5 mb-4">
        {(
          [
            ["", "All"],
            ["published", `Live${state.status === "ready" ? ` (${state.data.publishedCount})` : ""}`],
            ["hidden", `Hidden${state.status === "ready" ? ` (${state.data.hiddenCount})` : ""}`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => {
              setStatus(value);
              setPage(1);
            }}
            className={chip(status === value)}
          >
            {label}
          </button>
        ))}
        <span className="w-px h-5 bg-[#D4B896] mx-1" />
        {[0, 5, 4, 3, 2, 1].map((n) => (
          <button
            key={n}
            onClick={() => {
              setRating(n);
              setPage(1);
            }}
            className={chip(rating === n)}
          >
            {n === 0 ? "Any rating" : `${n}★`}
          </button>
        ))}
      </div>

      {error && <div className="bg-[#FDE8EF] text-[#B00B44] text-xs font-bold rounded-xl p-3 mb-4">{error}</div>}
      {state.status === "loading" && <div className="h-40 rounded-2xl bg-white border border-[#EDD9C0] shimmer" />}
      {state.status === "error" && (
        <div className="bg-[#FDE8EF] text-[#B00B44] text-sm font-bold rounded-2xl p-6 flex items-center justify-between">
          <span>{state.message}</span>
          <button onClick={state.reload} className="underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {state.status === "ready" && state.data.reviews.length === 0 && (
        <div className="bg-white border border-[#EDD9C0] rounded-2xl p-10 text-center text-sm font-bold text-[#8A8179]">
          No reviews here yet.
        </div>
      )}

      {state.status === "ready" && (
        <div className="space-y-3">
          {state.data.reviews.map((r) => (
            <div
              key={r.id}
              className={`bg-white border rounded-2xl p-4 ${r.status === "hidden" ? "border-dashed border-[#D4B896] opacity-70" : "border-[#EDD9C0]"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <a
                    href={`${STOREFRONT}/products/${r.productId}#reviews`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-black uppercase text-[#8B3A1A] hover:underline"
                  >
                    {r.productName}
                  </a>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <StarsRow value={r.rating} />
                    <span className="text-sm font-bold text-[#181410]">{r.authorName}</span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-black uppercase text-[#1B7A3D]">
                      <BadgeCheck size={12} /> {r.orderId}
                    </span>
                    <span className="text-[11px] text-[#8A8179]">{fmt(r.createdAt)}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggle(r)}
                  disabled={busyId === r.id}
                  className={`flex items-center gap-1.5 text-xs font-black uppercase px-3 py-1.5 rounded-full disabled:opacity-50 cursor-pointer ${
                    r.status === "published"
                      ? "border border-[#D4B896] text-[#B00B44] hover:bg-[#FDE8EF]"
                      : "bg-[#1B7A3D] text-white hover:bg-[#166030]"
                  }`}
                >
                  {r.status === "published" ? <EyeOff size={13} /> : <Eye size={13} />}
                  {r.status === "published" ? "Hide" : "Publish again"}
                </button>
              </div>
              <p className="text-sm text-[#3D2B1F] mt-2 whitespace-pre-line break-words">{r.comment}</p>
              {r.media.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {r.media.map((m) => (
                    <button
                      key={m.url}
                      onClick={() => setViewer(m)}
                      className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#EDD9C0] bg-[#F5EAD8] cursor-pointer"
                    >
                      {m.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <>
                          <video src={`${m.url}#t=0.1`} preload="metadata" muted className="w-full h-full object-cover" />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play size={16} className="text-white" fill="currentColor" />
                          </span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {state.data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs font-bold text-[#5C3A1E]">
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
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= state.data.totalPages}
                className="px-4 py-2 rounded-full border border-[#D4B896] bg-white disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {viewer && (
        <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4" onClick={() => setViewer(null)}>
          <button
            onClick={() => setViewer(null)}
            aria-label="Close"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center cursor-pointer"
          >
            <X size={20} />
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            {viewer.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewer.url} alt="" className="max-h-[85vh] max-w-full rounded-xl" />
            ) : (
              <video src={viewer.url} controls autoPlay className="max-h-[85vh] max-w-full rounded-xl" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
