import AdminNav from "@/components/admin/AdminNav";
import { isAuthenticated } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAuthenticated();
  const settings = getSettings();

  if (!authed) {
    // Only the login screen reaches this branch (middleware guards the rest).
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-line md:w-[240px] md:shrink-0 md:border-b-0 md:border-r">
        <div className="md:sticky md:top-0 md:h-screen">
          <AdminNav brand={settings.brand_name} />
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
