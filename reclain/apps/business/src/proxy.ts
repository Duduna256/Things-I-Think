export { proxy } from "@shared/lib/proxy";

// Next reads this list statically, so it has to be written out here rather than imported.
// Skip static files, images, the manifest and icons, and the payment webhook (no log-in).
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-.*\\.png|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
