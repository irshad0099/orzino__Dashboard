import { api } from "./api";
import type { OrderListItem, OrderStatus } from "../orders-shared";

export type AnalyticsOverview = {
  range: { days: number; from: string; to: string };
  summary: { revenue: number; orders: number; aov: number; pendingPayments: number };
  revenueTrend: { date: string; revenue: number; orders: number }[];
  statusBreakdown: { status: OrderStatus; count: number }[];
  topProducts: { name: string; units: number; revenue: number }[];
  recentOrders: OrderListItem[];
  customerInsights: {
    totalCustomers: number;
    repeatCustomers: number;
    repeatRate: number;
    topSpenders: { phone: string; name: string; orders: number; total: number }[];
  };
  lowStockProducts: { id: string; name: string; stock: number; weight: string }[];
};

export const getOverview = (days: 7 | 30 | 90) => api<AnalyticsOverview>(`/api/analytics/overview?days=${days}`);

export const analyticsExportUrl = (days: 7 | 30 | 90) => `/api/analytics/export?days=${days}`;

export type GeoOverview = {
  range: { days: number; from: string };
  totalOrders: number;
  cities: { city: string; orders: number; revenue: number }[];
};

export const getGeo = (days: 7 | 30 | 90 | 365) => api<GeoOverview>(`/api/analytics/geo?days=${days}`);
