import Link from "next/link";

export function NavBar() {
  return (
    <header className="bg-primary">
      <div className="mx-auto flex max-w-6xl items-center px-4 py-3">
        <Link
          href="/home"
          className="text-lg font-semibold tracking-tight text-primary-foreground"
        >
          EvolveXI
        </Link>
      </div>
    </header>
  );
}
