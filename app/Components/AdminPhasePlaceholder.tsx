import React from "react";
import { Construction } from "lucide-react";

export default function AdminPhasePlaceholder({
  title,
  blurb,
  phase,
  prdSection,
}: {
  title: string;
  blurb: string;
  phase: string;
  prdSection: string;
}) {
  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-black uppercase text-[#181410]">{title}</h1>
      <p className="text-sm text-[#5C3A1E] mt-1">{blurb}</p>
      <div className="mt-8 bg-white border border-[#EDD9C0] rounded-2xl p-8 flex items-start gap-4 text-[#8A8179] max-w-xl">
        <Construction size={26} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-[#181410]">Ships in {phase}.</p>
          <p className="text-xs mt-1">See the PRD, {prdSection}.</p>
        </div>
      </div>
    </div>
  );
}
