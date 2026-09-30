"use client";
import React, { useState } from "react";
import { Mail, MessageCircleQuestion, Phone } from "lucide-react";
import { useApiData } from "@/app/lib/useApiData";
import { listMessages, updateMessageStatus, type MessageStatus } from "@/app/lib/services/messages";

const STATUS_STYLE: Record<MessageStatus, string> = {
  new: "bg-[#FDE8EF] text-[#B00B44]",
  read: "bg-[#FFF3D6] text-[#8B6B00]",
  resolved: "bg-[#DFF3E4] text-[#1B7A3D]",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function MessagesPage() {
  const [status, setStatus] = useState<MessageStatus | "">("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const state = useApiData(() => listMessages({ status, page }), `messages-${status}-${page}`);

  const setMsgStatus = async (id: string, next: MessageStatus) => {
    setBusyId(id);
    try {
      await updateMessageStatus(id, next);
      state.reload();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-black uppercase text-[#181410] flex items-center gap-2">
            Messages
            {state.status === "ready" && state.data.newCount > 0 && (
              <span className="text-[10px] font-black bg-[#E8115B] text-white px-2 py-0.5 rounded-full">
                {state.data.newCount} new
              </span>
            )}
          </h1>
          <p className="text-sm text-[#5C3A1E] mt-1">Contact Us submissions from the storefront.</p>
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as MessageStatus | "");
            setPage(1);
          }}
          className="bg-white border border-[#EDD9C0] rounded-full px-3 py-2 text-xs font-bold text-[#5C3A1E] focus:outline-none focus:border-[#FFC300]"
        >
          <option value="">All messages</option>
          <option value="new">New</option>
          <option value="read">Read</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {state.status === "loading" && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-white border border-[#EDD9C0] shimmer" />
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
          {state.data.messages.length === 0 ? (
            <div className="bg-white border border-[#EDD9C0] rounded-2xl p-10 text-center text-sm text-[#8A8179]">
              No messages.
            </div>
          ) : (
            <div className="space-y-2">
              {state.data.messages.map((m) => {
                const open = openId === m.id;
                return (
                  <div key={m.id} className="bg-white border border-[#EDD9C0] rounded-2xl overflow-hidden">
                    <button
                      onClick={() => {
                        setOpenId(open ? null : m.id);
                        if (m.status === "new") setMsgStatus(m.id, "read");
                      }}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left cursor-pointer"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <MessageCircleQuestion size={16} className="text-[#B74418] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-black text-[#181410] truncate">
                            {m.name} &middot; <span className="font-normal text-[#5C3A1E]">{m.topic}</span>
                          </p>
                          <p className="text-[10px] text-[#8A8179]">
                            {m.reference} &middot; {fmt(m.createdAt)}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLE[m.status]}`}>
                        {m.status}
                      </span>
                    </button>
                    {open && (
                      <div className="px-4 pb-4 border-t border-[#EDD9C0] pt-3">
                        <p className="text-sm text-[#181410] leading-relaxed mb-3">{m.message}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#5C3A1E] mb-3">
                          <span className="flex items-center gap-1.5">
                            <Phone size={12} />
                            {m.phone}
                          </span>
                          {m.email && (
                            <span className="flex items-center gap-1.5">
                              <Mail size={12} />
                              {m.email}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={`https://wa.me/91${m.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-black uppercase px-3 py-1.5 rounded-full bg-[#25D366] text-white hover:bg-[#20bd5a]"
                          >
                            WhatsApp
                          </a>
                          {m.status !== "resolved" && (
                            <button
                              onClick={() => setMsgStatus(m.id, "resolved")}
                              disabled={busyId === m.id}
                              className="text-xs font-black uppercase px-3 py-1.5 rounded-full bg-[#1B7A3D] text-white hover:bg-[#166030] disabled:opacity-50 cursor-pointer"
                            >
                              Mark resolved
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
