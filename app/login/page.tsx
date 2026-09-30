"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import { Field, FormMessage, primaryButton } from "../Components/Field";
import { login } from "../lib/services/auth";
import { ServiceError } from "../lib/services/storage";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) return;
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ServiceError ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#181410] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-[#EDD9C0] shadow-2xl p-8">
        <div className="text-center mb-6">
          <p className="text-xs font-black uppercase tracking-widest text-[#B74418]">Orzino</p>
          <h1 className="text-xl font-black uppercase text-[#181410] mt-1">Admin sign in</h1>
        </div>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            icon={<Mail size={16} />}
            placeholder="you@orzino.com"
            autoComplete="username"
            disabled={submitting}
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            icon={<Lock size={16} />}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={submitting}
          />
          <button type="submit" disabled={submitting || !email || !password} className={primaryButton}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
