import type { NextRequest } from "next/server";
import { Types } from "mongoose";
import { handle, json } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { User } from "@/app/lib/server/models/User";
import { Order } from "@/app/lib/server/models/Order";
import type { AdminCustomer } from "@/app/lib/services/customers";

// Registered customer accounts (created on the storefront's sign-up page), newest first, with
// each customer's order count / spend. ?format=csv downloads the whole (filtered) list.

const PAGE_SIZE = 25;


function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export const GET = handle(async (req: NextRequest) => {
  await connectDB();
  await requireAdmin();

  const params = req.nextUrl.searchParams;
  const csv = params.get("format") === "csv";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const q = params.get("q")?.trim().slice(0, 100);

  const filter: Record<string, unknown> = {};
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  const query = User.find(filter).select("name email phone addresses createdAt").sort({ createdAt: -1 });
  const [users, total, totalAll, newThisWeek] = await Promise.all([
    csv ? query.limit(10_000) : query.skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE),
    User.countDocuments(filter),
    User.estimatedDocumentCount(),
    User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
  ]);

  const ids = users.map((u) => u._id as Types.ObjectId);
  const stats = await Order.aggregate<{ _id: Types.ObjectId; orders: number; totalSpent: number; lastOrderAt: Date }>([
    { $match: { userId: { $in: ids } } },
    {
      $group: {
        _id: "$userId",
        orders: { $sum: 1 },
        totalSpent: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 0, "$pricing.total"] } },
        lastOrderAt: { $max: "$createdAt" },
      },
    },
  ]);
  const byUser = new Map(stats.map((s) => [String(s._id), s]));

  const customers: AdminCustomer[] = users.map((u) => {
    const s = byUser.get(String(u._id));
    return {
      id: String(u._id),
      name: u.name ?? "",
      email: u.email ?? "",
      phone: u.phone ?? "",
      joinedAt: (u.createdAt ?? new Date(0)).toISOString(),
      addresses: (u.addresses ?? []).map((a) => ({
        label: a.label ?? "",
        name: a.name ?? "",
        phone: a.phone ?? "",
        address: a.address ?? "",
        isDefault: !!a.isDefault,
      })),
      orders: s?.orders ?? 0,
      totalSpent: s?.totalSpent ?? 0,
      lastOrderAt: s?.lastOrderAt ? s.lastOrderAt.toISOString() : null,
    };
  });

  if (csv) {
    const header = ["Name", "Email", "Phone", "Joined", "Orders", "Total spent", "Last order", "Default address"];
    const rows = customers.map((c) => [
      c.name,
      c.email,
      c.phone,
      c.joinedAt.slice(0, 10),
      String(c.orders),
      String(c.totalSpent),
      c.lastOrderAt ? c.lastOrderAt.slice(0, 10) : "",
      (c.addresses.find((a) => a.isDefault) ?? c.addresses[0])?.address ?? "",
    ]);
    const body = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
    return new Response("﻿" + body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orzino-customers-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return json({
    customers,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    totalAll,
    newThisWeek,
  });
});
