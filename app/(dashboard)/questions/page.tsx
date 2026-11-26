"use client";
import React, { useState } from "react";
import { EyeOff, Mail, Send } from "lucide-react";
import { useApiData } from "@/app/lib/useApiData";
import { listQuestions, updateQuestion, type AdminQuestion, type QuestionStatus } from "@/app/lib/services/questions";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function QuestionsPage() {
  const [status, setStatus] = useState<QuestionStatus | "all">("pending");
  const [page, setPage] = useState(1);
  const state = useApiData(() => listQuestions({ status, page }), `questions-${status}-${page}`);

  const chip = (active: boolean) =>
    `text-xs font-black uppercase px-3.5 py-1.5 rounded-full border cursor-pointer ${
      active ? "bg-[#181410] text-[#FFC300] border-[#181410]" : "bg-white text-[#5C3A1E] border-[#D4B896] hover:bg-[#F5E6D0]"
    }`;

  return (
    <div className="p-5 sm:p-8 max-w-4xl">
      <h1 className="text-2xl font-black uppercase text-[#181410]">Questions</h1>
      <p className="text-sm text-[#5C3A1E] mt-1">
        Asked on product pages. Your answer appears on the product page, and the shopper is emailed if they left an email.
      </p>

      <div className="flex flex-wrap gap-2 mt-5 mb-4">
        {(
          [
            ["pending", `Needs answer${state.status === "ready" ? ` (${state.data.pendingCount})` : ""}`],
            ["answered", "Answered"],
            ["hidden", "Hidden"],
            ["all", "All"],
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
      </div>

      {state.status === "loading" && <div className="h-40 rounded-2xl bg-white border border-[#EDD9C0] shimmer" />}
      {state.status === "error" && (
        <div className="bg-[#FDE8EF] text-[#B00B44] text-sm font-bold rounded-2xl p-6 flex items-center justify-between">
          <span>{state.message}</span>
          <button onClick={state.reload} className="underline cursor-pointer">
            Retry
          </button>
        </div>
      )}
      {state.status === "ready" && state.data.questions.length === 0 && (
        <div className="bg-white border border-[#EDD9C0] rounded-2xl p-10 text-center text-sm font-bold text-[#8A8179]">
          {status === "pending" ? "All caught up — no questions waiting." : "Nothing here."}
        </div>
      )}

      {state.status === "ready" && (
        <div className="space-y-3">
          {state.data.questions.map((q) => (
            <QuestionCard key={q.id} q={q} onChanged={state.reload} />
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
    </div>
  );
}

function QuestionCard({ q, onChanged }: { q: AdminQuestion; onChanged: () => void }) {
  const [answer, setAnswer] = useState(q.answer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (input: { answer?: string; status?: QuestionStatus }) => {
    setBusy(true);
    setError("");
    try {
      await updateQuestion(q.id, input);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`bg-white border rounded-2xl p-4 ${q.status === "hidden" ? "border-dashed border-[#D4B896] opacity-70" : "border-[#EDD9C0]"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-black uppercase text-[#8B3A1A]">{q.productName}</span>
        <span className="text-[11px] text-[#8A8179]">{fmt(q.createdAt)}</span>
      </div>
      <p className="text-sm font-bold text-[#181410] mt-1">{q.question}</p>
      <p className="text-[11px] text-[#5C3A1E] mt-0.5 flex items-center gap-1">
        {q.name}
        {q.email && (
          <>
            {" · "}
            <Mail size={11} /> {q.email}
          </>
        )}
      </p>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Write the answer shoppers will see on the product page"
        className="w-full mt-3 text-sm border border-[#EDD9C0] rounded-xl px-3 py-2 focus:outline-none focus:border-[#FFC300] resize-none"
      />
      {error && <p className="text-xs font-bold text-[#B00B44] mt-1">{error}</p>}
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <button
          onClick={() => save({ answer: answer.trim(), status: "answered" })}
          disabled={busy || answer.trim().length < 2 || (q.status === "answered" && answer.trim() === q.answer)}
          className="flex items-center gap-1.5 text-xs font-black uppercase px-4 py-1.5 rounded-full bg-[#181410] text-[#FFC300] disabled:opacity-50 cursor-pointer"
        >
          <Send size={12} />
          {q.status === "answered" ? "Update answer" : `Publish answer${q.email ? " & email" : ""}`}
        </button>
        {q.status !== "hidden" ? (
          <button
            onClick={() => save({ status: "hidden" })}
            disabled={busy}
            className="flex items-center gap-1.5 text-xs font-bold text-[#B00B44] px-3 py-1.5 rounded-full hover:bg-[#FDE8EF] disabled:opacity-50 cursor-pointer"
          >
            <EyeOff size={12} />
            Hide
          </button>
        ) : (
          <button
            onClick={() => save(q.answer ? { status: "answered", answer: q.answer } : { status: "pending" })}
            disabled={busy}
            className="text-xs font-bold text-[#5C3A1E] px-3 py-1.5 rounded-full hover:bg-[#F5E6D0] disabled:opacity-50 cursor-pointer"
          >
            Unhide
          </button>
        )}
      </div>
    </div>
  );
}
