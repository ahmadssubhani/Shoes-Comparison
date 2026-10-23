import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface text-text">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand Col */}
          <div className="space-y-3">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent font-bold text-sm text-white">
                S
              </span>
              <span className="font-semibold text-lg tracking-tight">ShoeScope</span>
            </Link>
            <p className="text-sm text-muted">Compare every step.</p>
          </div>

          {/* Col 1: PRODUCT */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-eyebrow text-muted">
              PRODUCT
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-text hover:text-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Discover
                </Link>
              </li>
              <li>
                <Link
                  href="/saved"
                  className="text-text hover:text-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Saved
                </Link>
              </li>
              <li>
                <Link
                  href="/methodology"
                  className="text-text hover:text-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Methodology
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: PROJECT */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-eyebrow text-muted">
              PROJECT
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/handoff"
                  className="text-text hover:text-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  MVP handoff
                </Link>
              </li>
              <li>
                <Link
                  href="/retailers"
                  className="text-text hover:text-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Data sources
                </Link>
              </li>
              <li>
                <Link
                  href="/states"
                  className="text-text hover:text-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  UI states
                </Link>
              </li>
            </ul>
          </div>

          {/* Disclaimer */}
          <div className="md:col-span-1">
            <p className="text-xs text-muted leading-relaxed">
              Independent comparison concept. Retailer names belong to their respective owners. Purchases happen on retailer websites.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
