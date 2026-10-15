import "@/styles/dashboard.css";
import type { Metadata } from "next";
import Link from "next/link";
import { SECURITY_CATEGORY } from "@/config/site";
import { requireAdmin } from "@/lib/auth";
import { data } from "@/lib/data";
import { internationalMsisdn, prettyMsisdn } from "@/lib/phone";
import { formatDate, localParts } from "@/lib/time";
import { Cover } from "@/components/Cover";
import { placeName } from "@/components/VenueCard";
import { AdminActions } from "@/components/dashboard/AdminActions";
import { PillTag } from "@/components/dashboard/BookingCard";
import { ADMIN_TABS, adminOps, BUSINESS_STATUS, parseAdminTab } from "@/components/dashboard/logic";
import { ToastProvider } from "@/components/dashboard/Toast";

export const metadata: Metadata = { title: "Approvals", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const EMPTY: Record<string, { title: string; body: string }> = {
  pending: { title: "Nobody waiting.", body: "New applications land here when an owner sends theirs for review." },
  published: { title: "No live businesses yet.", body: "Approve one from the Waiting tab and it shows up here." },
  draft: { title: "No drafts.", body: "Businesses that are still being set up, or were sent back, show up here." },
  suspended: { title: "Nothing suspended.", body: "Long may it last." },
};

export default async function AdminPage({ searchParams }: Props) {
  await requireAdmin();
  const tab = parseAdminTab(one((await searchParams).status));
  const [all, categories, areas] = await Promise.all([data.listBusinessesForAdmin(), data.listCategories(), data.listAreas()]);
  const counts = Object.fromEntries(ADMIN_TABS.map(t => [t, all.filter(b => b.status === t).length])) as Record<string, number>;
  // Oldest applications first, so nobody waits longest; newest first everywhere else.
  const list = all
    .filter(b => b.status === tab)
    .sort((a, b) => (tab === "pending" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)));
  const category = (id: string) => categories.find(c => c.id === id)?.name ?? id;
  const area = (id: string) => placeName(areas.find(a => a.id === id)) || id;

  return (
    <ToastProvider>
      <div className="wrap page dash">
        <p className="eyebrow">Admin</p>
        <h1 className="page-title dash-title">
          Business <span className="em">approvals</span>
        </h1>
        <p className="dash-lede muted">
          Check each one is real and its menu makes sense, then let it in. Security businesses also need to be a registered
          company: ask for their registration before you approve.
        </p>

        <nav aria-label="Businesses by status">
          <ul className="chips dash-tabs">
            {ADMIN_TABS.map(t => (
              <li key={t}>
                <Link className="chip" href={t === "pending" ? "/admin" : `/admin?status=${t}`} aria-current={t === tab ? "page" : undefined}>
                  {BUSINESS_STATUS[t].tab}
                  <span className="dash-count">{counts[t]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section className="dash-section" aria-labelledby="adm-h">
          <h2 id="adm-h" className="sr-only">
            {BUSINESS_STATUS[tab].tab}: {list.length}
          </h2>
          {list.length === 0 ? (
            <div className="empty">
              <b>{EMPTY[tab].title}</b>
              <p>{EMPTY[tab].body}</p>
            </div>
          ) : (
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Business</th>
                  <th scope="col">Category</th>
                  <th scope="col">Area</th>
                  <th scope="col">Created</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map(b => (
                  <tr key={b.id}>
                    <th scope="row">
                      <div className="adm-name">
                        <Cover palette={b.palette} word={b.coverWord} imageUrl={b.imageUrl} className="dash-mini" />
                        <div className="adm-name-text">
                          <Link href={`/v/${b.slug}`}>
                            {b.name}
                            {b.status !== "published" && <span className="sr-only"> (preview)</span>}
                          </Link>
                          <PillTag pill={BUSINESS_STATUS[b.status].pill} />
                          {b.phone && /^\d{9}$/.test(b.phone) && (
                            <a className="dash-tel" href={`tel:${internationalMsisdn(b.phone)}`}>
                              <span className="sr-only">Call </span>
                              {prettyMsisdn(b.phone)}
                            </a>
                          )}
                          {b.blurb && <small className="muted adm-blurb">{b.blurb}</small>}
                          {b.categoryId === SECURITY_CATEGORY && b.status === "pending" && (
                            <small className="adm-check">Security: check their company registration first.</small>
                          )}
                        </div>
                      </div>
                    </th>
                    <td data-label="Category">{category(b.categoryId)}</td>
                    <td data-label="Area">{area(b.areaId)}</td>
                    <td data-label="Created">{formatDate(localParts(b.createdAt).date)}</td>
                    <td className="adm-actions">
                      <AdminActions businessId={b.id} name={b.name} ops={adminOps(b.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </ToastProvider>
  );
}
