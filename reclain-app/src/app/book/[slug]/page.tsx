import "@/styles/booking.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { features } from "@/config/features";
import { site } from "@/config/site";
import { getSessionUser } from "@/lib/auth";
import { bookableDates } from "@/lib/booking/rules";
import { data } from "@/lib/data";
import { prettyMsisdn } from "@/lib/phone";
import { localParts } from "@/lib/time";
import { placeName } from "@/components/VenueCard";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { parseFlowQuery, payMethodsFor } from "@/components/booking/flow-state";
import type { FlowBusiness } from "@/components/booking/types";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// One venue lookup per request, shared by the metadata and the page.
const loadVenue = cache((slug: string) => data.getBusinessBySlug(slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const venue = await loadVenue(slug);
  return { title: venue ? `Book ${venue.name}` : "Venue not found", robots: { index: false } };
}

function openTodayText(opensAt: string, closesAt: string, closedDays: number[], weekday: number): string {
  return closedDays.includes(weekday) ? "Closed today" : `Open today ${opensAt}–${closesAt}`;
}

export default async function BookPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const venue = await loadVenue(slug);
  if (!venue) notFound();

  const [user, profile, categories, areas] = await Promise.all([
    getSessionUser(),
    data.getMyProfile(),
    data.listCategories(),
    data.listAreas(),
  ]);

  const now = new Date();
  const dates = bookableDates(site.bookingWindowDays, now);
  const payMethods = payMethodsFor(features, venue.acceptsCash);
  const homeVisitsOn = features.homeVisits;
  const initial = parseFlowQuery(query, {
    menuIds: venue.services.map(s => s.id),
    staffIds: venue.staff.map(s => s.id),
    skipProfessional: venue.skipProfessional,
    visitMode: venue.visitMode,
    homeVisitsOn,
    closedDays: venue.closedDays,
    dates,
    payMethods,
    now,
    minLeadMinutes: site.minLeadMinutes,
  });

  const business: FlowBusiness = {
    id: venue.id,
    slug: venue.slug,
    name: venue.name,
    categoryId: venue.categoryId,
    blurb: venue.blurb,
    visitMode: venue.visitMode,
    homeVisitFee: venue.homeVisitFee,
    skipProfessional: venue.skipProfessional,
    palette: venue.palette,
    coverWord: venue.coverWord,
    imageUrl: venue.imageUrl,
    opensAt: venue.opensAt,
    closesAt: venue.closesAt,
    closedDays: venue.closedDays,
    ratingAvg: venue.ratingAvg,
    ratingCount: venue.ratingCount,
  };
  const phone = profile?.phone ?? user?.phone ?? null;

  return (
    <BookingFlow
      key={venue.slug}
      business={business}
      services={venue.services}
      staff={venue.staff.map(s => ({ id: s.id, name: s.name, role: s.role, rating: s.rating }))}
      categoryName={categories.find(c => c.id === venue.categoryId)?.name ?? ""}
      areaName={placeName(areas.find(a => a.id === venue.areaId))}
      openToday={openTodayText(venue.opensAt, venue.closesAt, venue.closedDays, localParts(now).weekday)}
      dates={dates}
      payMethods={payMethods}
      allowHome={venue.visitMode === "both" && homeVisitsOn}
      initial={initial}
      customer={{
        loggedIn: !!user,
        name: profile?.fullName ?? user?.fullName ?? "",
        phone: phone ? prettyMsisdn(phone) : "",
      }}
    />
  );
}
