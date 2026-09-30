"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Map,
  Menu,
  MessageSquare,
  Package,
  Settings,
  X,
} from "lucide-react";
import { logout } from "../lib/services/auth";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ListOrdered },
  { href: "/orders/map", label: "Heatmap", icon: Map },
  { href: "/products", label: "Products", icon: Package },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isActiveHref(pathname: string, href: (typeof NAV)[number]["href"]): boolean {
  // "/orders" must not also light up on "/orders/map" (a separate nav item).
  if (href === "/") return pathname === href;
  if (href === "/orders") {
    return pathname === "/orders" || (pathname.startsWith("/orders/") && !pathname.startsWith("/orders/map"));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminShell({
  adminEmail,
  children,
}: {
  adminEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  // Plain in-memory toggle (resets on reload) — avoids a localStorage/SSR hydration mismatch
  // for what's just a per-session convenience.
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleCollapsed = () => setCollapsed((prev) => !prev);

  // Close the mobile drawer whenever the route changes (adjusting state during
  // render instead of an effect, so it doesn't trigger a cascading re-render).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
  }

  const handleLogout = async () => {
    await logout().catch(() => {});
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#F0EAE0] flex flex-col sm:flex-row">
      {/* Mobile top bar */}
      <div className="sm:hidden print:hidden flex items-center justify-between px-4 py-3 bg-[#181410] text-white sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Orzino" width={28} height={28} className="rounded-lg shrink-0" priority />
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#FFC300] leading-none">Orzino</p>
            <p className="text-xs font-black uppercase leading-none mt-0.5">Admin</p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="p-2 rounded-lg hover:bg-white/10 cursor-pointer"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer + backdrop */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-40 flex">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50 cursor-pointer"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 max-w-[80%] bg-[#181410] text-white h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Image src="/logo.png" alt="Orzino" width={30} height={30} className="rounded-lg shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#FFC300] leading-none">Orzino</p>
                  <p className="text-sm font-black uppercase leading-none mt-0.5">Admin</p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = isActiveHref(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                      active ? "bg-[#FFC300] text-[#181410]" : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="px-3 pb-4 border-t border-white/10 pt-3">
              <p className="text-[11px] text-white/50 truncate mb-2 px-1">{adminEmail}</p>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-xs font-bold text-white/70 hover:text-white cursor-pointer px-1"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden sm:flex print:hidden shrink-0 bg-[#181410] text-white sm:flex-col transition-[width] duration-200 sm:sticky sm:top-0 sm:h-screen sm:overflow-hidden ${
          collapsed ? "sm:w-[76px]" : "sm:w-60"
        }`}
      >
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/10 overflow-hidden">
          <Image
            src="/logo.png"
            alt="Orzino"
            width={34}
            height={34}
            className="rounded-lg shrink-0"
            priority
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#FFC300] truncate">Orzino</p>
              <p className="text-sm font-black uppercase truncate">Admin</p>
            </div>
          )}
        </div>

        <nav className="flex flex-col flex-1 px-3 py-4 gap-1 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActiveHref(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                  collapsed ? "justify-center" : ""
                } ${active ? "bg-[#FFC300] text-[#181410]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon size={16} className="shrink-0" />
                <span className={collapsed ? "hidden" : ""}>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-white/10">
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expand" : "Collapse"}
            className={`w-full flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white cursor-pointer px-3 py-2 rounded-xl hover:bg-white/10 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
            {!collapsed && "Collapse"}
          </button>
        </div>

        <div className={`px-3 pb-4 border-t border-white/10 pt-3 ${collapsed ? "text-center" : ""}`}>
          {!collapsed && <p className="text-[11px] text-white/50 truncate mb-2 px-1">{adminEmail}</p>}
          <button
            onClick={handleLogout}
            title="Sign out"
            className={`flex items-center gap-2 text-xs font-bold text-white/70 hover:text-white cursor-pointer px-1 ${
              collapsed ? "justify-center w-full" : ""
            }`}
          >
            <LogOut size={14} />
            {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
