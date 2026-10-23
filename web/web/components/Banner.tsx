import Link from "next/link";

export function Banner() {
  return (
    <aside
      aria-label="Announcement"
      className="bg-ink text-white py-2 px-4 sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center font-mono text-xs tracking-wider">
        <span>Prototype data · Prices shown from public store listings</span>
        <Link
          href="/methodology"
          className="text-lime font-medium hover:underline inline-flex items-center gap-0.5"
        >
          How matching works →
        </Link>
      </div>
    </aside>
  );
}
