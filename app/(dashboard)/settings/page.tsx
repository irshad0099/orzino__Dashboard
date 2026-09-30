"use client";
import React, { useState } from "react";
import { Lock, Save } from "lucide-react";
import { Field, FormMessage, primaryButton } from "@/app/Components/Field";
import { useApiData } from "@/app/lib/useApiData";
import { getSettings, updateSettings, changeAdminPassword, type SiteSettings } from "@/app/lib/services/settings";
import { ServiceError } from "@/app/lib/services/storage";

function BusinessSettingsForm({ initial }: { initial: SiteSettings }) {
  const [gstPercent, setGstPercent] = useState(String(Math.round(initial.gstRate * 100)));
  const [deliveryCharge, setDeliveryCharge] = useState(String(initial.deliveryCharge));
  const [freeDeliveryMinPacks, setFreeDeliveryMinPacks] = useState(String(initial.freeDeliveryMinPacks));
  const [maxPerProduct, setMaxPerProduct] = useState(String(initial.maxPerProduct));
  const [etaMinDays, setEtaMinDays] = useState(String(initial.etaMinDays));
  const [etaMaxDays, setEtaMaxDays] = useState(String(initial.etaMaxDays));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const values = {
      gstRate: Number(gstPercent) / 100,
      deliveryCharge: Number(deliveryCharge),
      freeDeliveryMinPacks: Number(freeDeliveryMinPacks),
      maxPerProduct: Number(maxPerProduct),
      etaMinDays: Number(etaMinDays),
      etaMaxDays: Number(etaMaxDays),
    };
    if (Object.values(values).some((v) => !Number.isFinite(v) || v < 0)) {
      setError("Enter valid numbers for every field.");
      return;
    }
    if (values.etaMinDays > values.etaMaxDays) {
      setError("Minimum delivery days can't be more than maximum.");
      return;
    }

    setSaving(true);
    try {
      await updateSettings(values);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof ServiceError ? err.message : "Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 max-w-xl">
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {success && <FormMessage kind="success">Saved — the storefront picks this up immediately.</FormMessage>}

      <div className="grid grid-cols-2 gap-4">
        <Field label="GST rate (%)" value={gstPercent} onChange={setGstPercent} disabled={saving} />
        <Field label="Delivery charge (₹)" value={deliveryCharge} onChange={setDeliveryCharge} disabled={saving} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Free delivery from (packs)"
          value={freeDeliveryMinPacks}
          onChange={setFreeDeliveryMinPacks}
          disabled={saving}
        />
        <Field label="Max packs per product" value={maxPerProduct} onChange={setMaxPerProduct} disabled={saving} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Delivery ETA — min (days)" value={etaMinDays} onChange={setEtaMinDays} disabled={saving} />
        <Field label="Delivery ETA — max (days)" value={etaMaxDays} onChange={setEtaMaxDays} disabled={saving} />
      </div>

      <button type="submit" disabled={saving} className={`${primaryButton} w-auto px-8 inline-flex items-center gap-2`}>
        <Save size={14} />
        {saving ? "Saving..." : "Save business settings"}
      </button>
    </form>
  );
}

function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New password and confirmation don't match.");
      return;
    }
    setSaving(true);
    try {
      await changeAdminPassword(current, next);
      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof ServiceError ? err.message : "Couldn't change the password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 max-w-sm">
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {success && <FormMessage kind="success">Password changed. Other sessions are signed out.</FormMessage>}
      <Field
        label="Current password"
        type="password"
        value={current}
        onChange={setCurrent}
        icon={<Lock size={16} />}
        autoComplete="current-password"
        disabled={saving}
      />
      <Field
        label="New password"
        type="password"
        value={next}
        onChange={setNext}
        icon={<Lock size={16} />}
        autoComplete="new-password"
        disabled={saving}
      />
      <Field
        label="Confirm new password"
        type="password"
        value={confirm}
        onChange={setConfirm}
        icon={<Lock size={16} />}
        autoComplete="new-password"
        disabled={saving}
      />
      <button type="submit" disabled={saving} className={`${primaryButton} w-auto px-8`}>
        {saving ? "Changing..." : "Change password"}
      </button>
    </form>
  );
}

export default function SettingsPage() {
  const state = useApiData(getSettings, "settings");

  return (
    <div className="p-5 sm:p-8">
      <h1 className="text-2xl font-black uppercase text-[#181410] mb-1">Settings</h1>
      <p className="text-sm text-[#5C3A1E] mb-6">
        Business settings apply to the storefront immediately — no redeploy needed.
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#EDD9C0] rounded-2xl p-6">
          <h2 className="text-xs font-black uppercase tracking-wide text-[#5C3A1E] mb-4">Business settings</h2>
          {state.status === "loading" && <div className="h-64 rounded-xl bg-[#F5E6D0] shimmer" />}
          {state.status === "error" && (
            <div className="bg-[#FDE8EF] text-[#B00B44] text-sm font-bold rounded-2xl p-4 flex items-center justify-between">
              <span>{state.message}</span>
              <button onClick={state.reload} className="underline cursor-pointer">
                Retry
              </button>
            </div>
          )}
          {state.status === "ready" && <BusinessSettingsForm initial={state.data} />}
        </div>

        <div className="bg-white border border-[#EDD9C0] rounded-2xl p-6 h-fit">
          <h2 className="text-xs font-black uppercase tracking-wide text-[#5C3A1E] mb-4">Change password</h2>
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
