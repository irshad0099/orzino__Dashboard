import { api } from "./api";

export type SiteSettings = {
  gstRate: number;
  deliveryCharge: number;
  freeDeliveryMinPacks: number;
  maxPerProduct: number;
  etaMinDays: number;
  etaMaxDays: number;
};

export const getSettings = () => api<{ settings: SiteSettings }>("/api/settings").then((r) => r.settings);

export const updateSettings = (input: SiteSettings) =>
  api<{ settings: SiteSettings }>("/api/settings", { method: "PATCH", body: input }).then((r) => r.settings);

export const changeAdminPassword = (currentPassword: string, newPassword: string) =>
  api<{ ok: true }>("/api/auth/change-password", { method: "POST", body: { currentPassword, newPassword } }).then(
    () => {}
  );
