"use client";
import React, { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type BaseProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  icon?: React.ReactNode;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
};

const inputBase =
  "w-full bg-white border-2 rounded-xl py-2.5 text-sm text-[#181410] placeholder:text-[#8A8179] focus:outline-none focus:border-[#FFC300] transition-colors disabled:opacity-60";

const labelClass = "block text-[11px] font-black uppercase tracking-wider text-[#5C3A1E] mb-1.5";

export function Field({
  label,
  value,
  onChange,
  error,
  icon,
  placeholder,
  autoComplete,
  disabled,
  type = "text",
}: BaseProps & { type?: "text" | "email" | "password" }) {
  const id = useId();
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative flex items-center">
        {icon && <span className="absolute left-3.5 text-[#8B3A1A] pointer-events-none flex items-center">{icon}</span>}
        <input
          id={id}
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={!!error}
          className={`${inputBase} ${icon ? "pl-10" : "pl-3.5"} ${isPassword ? "pr-10" : "pr-3.5"} ${
            error ? "border-[#E8115B]" : "border-[#EDD9C0]"
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3.5 text-[#8A8179] hover:text-[#181410] cursor-pointer"
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-[11px] font-bold text-[#E8115B] mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormMessage({ kind, children }: { kind: "error" | "success"; children: React.ReactNode }) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`text-xs font-bold rounded-xl px-4 py-3 ${
        kind === "error" ? "bg-[#FDE8EF] text-[#B00B44]" : "bg-[#DFF3E4] text-[#1B7A3D]"
      }`}
    >
      {children}
    </div>
  );
}

export const primaryButton =
  "w-full bg-[#FFC300] hover:bg-[#e8b700] text-[#181410] py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer";
