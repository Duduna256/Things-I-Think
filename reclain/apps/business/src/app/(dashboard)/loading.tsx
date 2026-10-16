// Shown inside the dashboard shell while a section loads, so the tabs respond straight away.
export default function DashboardLoading() {
  return (
    <div className="dash-loading" role="status">
      <span className="sr-only">Loading…</span>
      <span className="dash-skel dash-skel-title" aria-hidden="true" />
      <span className="dash-skel dash-skel-line" aria-hidden="true" />
      <span className="dash-skel dash-skel-card" aria-hidden="true" />
      <span className="dash-skel dash-skel-card" aria-hidden="true" />
    </div>
  );
}
