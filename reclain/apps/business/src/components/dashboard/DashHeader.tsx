// The top of every dashboard page: which business this is, a switcher for owners of more than
// one, and a banner saying whether customers can see it yet. Server-rendered.

import Link from "next/link";
import { switchBusinessAction } from "@/app/actions";
import { Cover } from "@shared/components/Cover";
import { Icon } from "@shared/components/Icon";
import { features } from "@shared/config/features";
import { site } from "@shared/config/site";
import type { Business } from "@shared/lib/types";
import { SubmitForReview } from "./SubmitForReview";

export function DashHeader({ business, businesses, place }: { business: Business; businesses: Business[]; place: string }) {
  return (
    <div className="dash-head">
      <div className="dash-id">
        <Cover palette={business.palette} word={business.coverWord} imageUrl={business.imageUrl} className="dash-mini" />
        <div className="dash-id-text">
          <p className="eyebrow">Your business</p>
          <p className="dash-id-name">{business.name}</p>
          <p className="muted dash-id-meta">{place}</p>
        </div>
      </div>
      {businesses.length > 1 && (
        <form key={business.id} action={switchBusinessAction} className="dash-switch">
          <label className="field">
            <span>Managing</span>
            <select name="businessId" defaultValue={business.id}>
              {businesses.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-ghost btn-sm">
            Switch
          </button>
        </form>
      )}
    </div>
  );
}

export function StatusBanner({ business }: { business: Business }) {
  switch (business.status) {
    case "draft":
      return (
        <div className="notice notice-info dash-banner">
          <Icon name="edit" />
          <div className="dash-banner-text">
            <p>{features.businessApproval ? "Finish your profile and send it for review." : "Finish your profile and send it in to go live."}</p>
            <p className="dash-banner-sub">
              Add your <Link href="/services">services</Link>, check your <Link href="/team">team</Link> and{" "}
              <Link href="/settings">settings</Link>. Customers can&apos;t see you yet.
            </p>
          </div>
          <SubmitForReview businessId={business.id} label={features.businessApproval ? "Send for review" : "Send it in"} />
        </div>
      );
    case "pending":
      return (
        <div className="notice notice-warn dash-banner" role="status">
          <Icon name="clock" />
          <div className="dash-banner-text">
            <p>Waiting for a quick review. We&apos;ll be in touch.</p>
            <p className="dash-banner-sub">You can keep editing your menu, team and settings in the meantime.</p>
          </div>
        </div>
      );
    case "suspended":
      return (
        <div className="notice notice-err dash-banner" role="status">
          <Icon name="alert" />
          <div className="dash-banner-text">
            <p>Your business is hidden from customers for now.</p>
            <p className="dash-banner-sub">
              Email <a href={`mailto:${site.email}?subject=${encodeURIComponent(`${business.name} is suspended`)}`}>{site.email}</a> and we&apos;ll help you
              sort it out.
            </p>
          </div>
        </div>
      );
    case "published":
      return (
        <div className="dash-live-bar">
          <span className="pill pill-ok">
            <span className="dash-dot" aria-hidden="true" />
            Live
          </span>
          <span className="muted">Customers can find and book you.</span>
          <Link className="link-btn dash-view" href={`${site.customerUrl}/v/${business.slug}`}>
            See your public page
            <Icon name="arrow" />
          </Link>
        </div>
      );
  }
}
