import { data } from "@/lib/data";
import { placeName } from "@/components/VenueCard";
import { DashHeader, StatusBanner } from "@/components/dashboard/DashHeader";
import { DashNav } from "@/components/dashboard/DashNav";
import { ToastProvider } from "@/components/dashboard/Toast";
import { getDashboard } from "../_lib/context";

// The dashboard shell: which business, its status, and the section tabs.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { business, businesses } = await getDashboard();
  const [categories, areas] = await Promise.all([data.listCategories(), data.listAreas()]);
  const category = categories.find(c => c.id === business.categoryId)?.name;
  const place = [category, placeName(areas.find(a => a.id === business.areaId))].filter(Boolean).join(" · ");

  return (
    <ToastProvider>
      <div className="wrap page dash">
        <DashHeader business={business} businesses={businesses} place={place} />
        <StatusBanner business={business} />
        <DashNav />
        <div className="dash-body">{children}</div>
      </div>
    </ToastProvider>
  );
}
