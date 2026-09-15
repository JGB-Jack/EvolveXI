// Next.js shows this the instant a navigation starts, while the
// destination page's own data is still being fetched on the server -
// replaces the "did my tap register?" frozen feeling with immediate
// feedback. Sits inside DashboardShell's content area only, so the nav
// bar and bottom nav stay visible and tappable throughout.
export default function DashboardLoading() {
  return <div className="min-h-[50vh]" />;
}
