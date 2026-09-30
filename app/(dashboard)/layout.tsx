import { redirect } from "next/navigation";
import { connectDB } from "@/app/lib/server/db";
import { getSessionAdmin } from "@/app/lib/server/auth";
import AdminShell from "@/app/Components/AdminShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await connectDB();
  const admin = await getSessionAdmin();
  if (!admin) redirect("/login");

  return <AdminShell adminEmail={admin.email}>{children}</AdminShell>;
}
