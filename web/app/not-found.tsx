import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
      <h1 className="font-display text-4xl">Page not found</h1>
      <p className="mt-3 text-muted">That route is not part of this prototype.</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-ink px-5 py-2 text-sm text-bg">
        Back to Discover
      </Link>
    </div>
  );
}
