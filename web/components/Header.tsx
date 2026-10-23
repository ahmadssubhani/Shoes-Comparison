// "use client";

// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { useEffect, useRef, useState } from "react";
// import { useAppState } from "./AppState";
// import { IconClose, IconMenu, IconSearch } from "./Icons";
// import { SearchModal } from "./SearchModal";

// const NAV_LINKS = [
//   { href: "/", label: "Discover" },
//   { href: "/retailers", label: "Retailers" },
//   { href: "/methodology", label: "How it works" },
//   { href: "/handoff", label: "Build handoff" },
// ];

// export function Header() {
//   const pathname = usePathname();
//   const { saved } = useAppState();
//   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
//   const [searchModalOpen, setSearchModalOpen] = useState(false);
//   const searchTriggerRef = useRef<HTMLButtonElement>(null);

//   // Close mobile drawer on route change
//   useEffect(() => {
//     setMobileMenuOpen(false);
//     setSearchModalOpen(false);
//   }, [pathname]);

//   // "/" keyboard shortcut to open search modal
//   useEffect(() => {
//     function handleKeyDown(e: KeyboardEvent) {
//       if (
//         e.key === "/" &&
//         !searchModalOpen &&
//         !(
//           e.target instanceof HTMLInputElement ||
//           e.target instanceof HTMLTextAreaElement ||
//           (e.target as HTMLElement)?.isContentEditable
//         )
//       ) {
//         e.preventDefault();
//         setSearchModalOpen(true);
//       }
//     }

//     window.addEventListener("keydown", handleKeyDown);
//     return () => window.removeEventListener("keydown", handleKeyDown);
//   }, [searchModalOpen]);

//   return (
//     <>
//       <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-md">
//         <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
//           {/* Left: Brand Logo */}
//           <Link
//             href="/"
//             className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
//           >
//             <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-sans font-bold text-base text-white shadow-sm">
//               S
//             </span>
//             <span className="font-sans font-semibold text-xl tracking-tight text-text">
//               ShoeScope
//             </span>
//           </Link>

//           {/* Center Nav: Visible at >= 900px */}
//           <nav
//             className="hidden min-[900px]:flex items-center gap-6 text-sm font-medium"
//             aria-label="Main navigation"
//           >
//             {NAV_LINKS.map((link) => {
//               const active = pathname === link.href;
//               return (
//                 <Link
//                   key={link.href}
//                   href={link.href}
//                   className={`transition-colors hover:text-accent ${
//                     active ? "text-ink font-semibold" : "text-muted"
//                   } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
//                 >
//                   {link.label}
//                 </Link>
//               );
//             })}
//           </nav>

//           {/* Right Action Items */}
//           <div className="flex items-center gap-2.5">
//             {/* Search Icon Button */}
//             <button
//               ref={searchTriggerRef}
//               type="button"
//               onClick={() => setSearchModalOpen(true)}
//               aria-label="Search shoes (Press /)"
//               title="Search (Press /)"
//               className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-ink shadow-sm hover:border-text transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
//             >
//               <IconSearch className="h-4 w-4" />
//             </button>

//             {/* Saved Pill Button with black count badge */}
//             <Link
//               href="/saved"
//               className="flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-text shadow-sm hover:border-text transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
//             >
//               <span>Saved</span>
//               <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 font-mono text-[10px] font-semibold text-white">
//                 {saved.length}
//               </span>
//             </Link>

//             {/* Mobile Menu Button (< 900px) */}
//             <button
//               type="button"
//               onClick={() => setMobileMenuOpen(true)}
//               aria-expanded={mobileMenuOpen}
//               aria-label="Open navigation menu"
//               className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-ink shadow-sm min-[900px]:hidden hover:border-text transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
//             >
//               <IconMenu className="h-4 w-4" />
//             </button>
//           </div>
//         </div>

//         {/* Mobile Navigation Drawer */}
//         {mobileMenuOpen ? (
//           <div
//             className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm min-[900px]:hidden"
//             role="dialog"
//             aria-modal="true"
//             aria-label="Mobile Navigation"
//             onClick={(e) => {
//               if (e.target === e.currentTarget) setMobileMenuOpen(false);
//             }}
//           >
//             <div className="ml-auto flex h-full w-[min(100%,18rem)] flex-col bg-surface p-6 shadow-2xl">
//               <div className="flex items-center justify-between pb-6 border-b border-border">
//                 <div className="flex items-center gap-2">
//                   <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent font-bold text-sm text-white">
//                     S
//                   </span>
//                   <span className="font-semibold text-lg">ShoeScope</span>
//                 </div>
//                 <button
//                   type="button"
//                   onClick={() => setMobileMenuOpen(false)}
//                   aria-label="Close menu"
//                   className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
//                 >
//                   <IconClose className="h-5 w-5" />
//                 </button>
//               </div>

//               <nav className="mt-6 flex flex-col gap-4 text-base font-medium">
//                 {NAV_LINKS.map((link) => (
//                   <Link
//                     key={link.href}
//                     href={link.href}
//                     onClick={() => setMobileMenuOpen(false)}
//                     className={`py-1.5 transition-colors hover:text-accent ${
//                       pathname === link.href ? "text-accent font-semibold" : "text-text"
//                     }`}
//                   >
//                     {link.label}
//                   </Link>
//                 ))}
//                 <Link
//                   href="/saved"
//                   onClick={() => setMobileMenuOpen(false)}
//                   className="flex items-center justify-between py-1.5 text-text hover:text-accent border-t border-border pt-4 mt-2"
//                 >
//                   <span>Saved pairs</span>
//                   <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-xs text-white">
//                     {saved.length}
//                   </span>
//                 </Link>
//               </nav>
//             </div>
//           </div>
//         ) : null}
//       </header>

//       {/* Global Search Modal */}
//       <SearchModal
//         isOpen={searchModalOpen}
//         onClose={() => setSearchModalOpen(false)}
//         triggerRef={searchTriggerRef}
//       />
//     </>
//   );
// }

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAppState } from "./AppState";
import { IconClose, IconMenu, IconSearch } from "./Icons";
import { SearchModal } from "./SearchModal";

const NAV_LINKS = [
  { href: "/", label: "Discover" },
  { href: "/retailers", label: "Retailers" },
  { href: "/methodology", label: "How it works" },
  { href: "/handoff", label: "Build handoff" },
];

export function Header() {
  const pathname = usePathname();
  const { saved } = useAppState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchModalOpen(false);
  }, [pathname]);

  // "/" keyboard shortcut to open search modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        !searchModalOpen &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          (e.target as HTMLElement)?.isContentEditable
        )
      ) {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchModalOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-md">
        <div className="site-container flex items-center justify-between gap-4 py-2.5">
          {/* Left: Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent font-sans text-sm font-bold text-white">
              S
            </span>
            <span className="font-sans text-[15px] font-bold tracking-tight text-ink">
              ShoeScope
            </span>
          </Link>

          {/* Center Nav: Visible at >= 900px */}
          <nav
            className="hidden min-[900px]:flex items-center gap-7 text-xs font-medium"
            aria-label="Main navigation"
          >
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors hover:text-accent ${
                    active ? "text-ink font-semibold" : "text-muted"
                  } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Items */}
          <div className="flex items-center gap-2">
            {/* Search Icon Button */}
            <button
              ref={searchTriggerRef}
              type="button"
              onClick={() => setSearchModalOpen(true)}
              aria-label="Search shoes (Press /)"
              title="Search (Press /)"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-ink hover:border-text transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <IconSearch className="h-3.5 w-3.5" />
            </button>

            {/* Saved Pill Button with black count badge */}
            <Link
              href="/saved"
              className="flex h-8 items-center gap-2 rounded-full border border-border bg-surface px-3 text-[11px] font-medium text-text hover:border-text transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span>Saved</span>
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 font-mono text-[9px] font-semibold text-white">
                {saved.length}
              </span>
            </Link>

            {/* Mobile Menu Button (< 900px) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-expanded={mobileMenuOpen}
              aria-label="Open navigation menu"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-ink min-[900px]:hidden hover:border-text transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <IconMenu className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen ? (
          <div
            className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm min-[900px]:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setMobileMenuOpen(false);
            }}
          >
            <div className="ml-auto flex h-full w-[min(100%,18rem)] flex-col bg-surface p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent font-bold text-sm text-white">
                    S
                  </span>
                  <span className="font-semibold text-lg">ShoeScope</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <IconClose className="h-5 w-5" />
                </button>
              </div>

              <nav className="mt-6 flex flex-col gap-4 text-base font-medium">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`py-1.5 transition-colors hover:text-accent ${
                      pathname === link.href ? "text-accent font-semibold" : "text-text"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/saved"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-1.5 text-text hover:text-accent border-t border-border pt-4 mt-2"
                >
                  <span>Saved pairs</span>
                  <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-xs text-white">
                    {saved.length}
                  </span>
                </Link>
              </nav>
            </div>
          </div>
        ) : null}
      </header>

      {/* Global Search Modal */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        triggerRef={searchTriggerRef}
      />
    </>
  );
}