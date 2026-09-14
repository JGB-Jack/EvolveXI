import Image from "next/image";

// Next.js shows this the instant a navigation starts, while the
// destination page's own data is still being fetched on the server -
// replaces the "did my tap register?" frozen feeling with immediate
// feedback. Sits inside DashboardShell's content area only, so the nav
// bar and bottom nav stay visible and tappable throughout.
export default function DashboardLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Image
        src="/evolvexi-logo.png"
        alt="Loading"
        width={64}
        height={64}
        className="animate-pulse"
        priority
      />
    </div>
  );
}
