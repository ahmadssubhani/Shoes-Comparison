// "use client";

// import { useEffect, useRef, useState } from "react";
// import { useRouter } from "next/navigation";
// import { IconClose, IconSearch } from "./Icons";

// type SearchModalProps = {
//   isOpen: boolean;
//   onClose: () => void;
//   triggerRef?: React.RefObject<HTMLButtonElement | null>;
//   retailerCount?: number;
// };

// const POPULAR_CHIPS = [
//   { label: "Puma Palermo", href: "/search?q=Puma+Palermo" },
//   { label: "Nike Air Max", href: "/search?q=Nike+Air+Max" },
//   { label: "Skechers", href: "/search?q=Skechers" },
//   { label: "Under $80", href: "/search?price=under80" },
// ];

// export function SearchModal({
//   isOpen,
//   onClose,
//   triggerRef,
//   retailerCount = 5,
// }: SearchModalProps) {
//   const router = useRouter();
//   const [query, setQuery] = useState("");
//   const modalRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLInputElement>(null);

//   // Focus input on open, and restore focus to trigger on close
//   useEffect(() => {
//     if (isOpen) {
//       const timer = setTimeout(() => {
//         inputRef.current?.focus();
//       }, 50);
//       return () => clearTimeout(timer);
//     } else {
//       triggerRef?.current?.focus();
//     }
//   }, [isOpen, triggerRef]);

//   // Focus trap and Escape key listener
//   useEffect(() => {
//     if (!isOpen) return;

//     function handleKeyDown(e: KeyboardEvent) {
//       if (e.key === "Escape") {
//         e.preventDefault();
//         onClose();
//         return;
//       }

//       if (e.key === "Tab" && modalRef.current) {
//         const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
//           'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
//         );
//         if (!focusableElements.length) return;

//         const firstElement = focusableElements[0];
//         const lastElement = focusableElements[focusableElements.length - 1];

//         if (e.shiftKey) {
//           if (document.activeElement === firstElement) {
//             e.preventDefault();
//             lastElement.focus();
//           }
//         } else {
//           if (document.activeElement === lastElement) {
//             e.preventDefault();
//             firstElement.focus();
//           }
//         }
//       }
//     }

//     document.addEventListener("keydown", handleKeyDown);
//     return () => document.removeEventListener("keydown", handleKeyDown);
//   }, [isOpen, onClose]);

//   if (!isOpen) return null;

//   function handleSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     const trimmed = query.trim();
//     onClose();
//     if (trimmed) {
//       router.push(`/search?q=${encodeURIComponent(trimmed)}`);
//     } else {
//       router.push("/search");
//     }
//   }

//   function handleChipClick(href: string) {
//     onClose();
//     router.push(href);
//   }

//   return (
//     <div
//       role="dialog"
//       aria-modal="true"
//       aria-label="Search across retailers"
//       className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-ink/60 backdrop-blur-sm transition-opacity"
//       onClick={(e) => {
//         if (e.target === e.currentTarget) onClose();
//       }}
//     >
//       <div
//         ref={modalRef}
//         className="w-full max-w-xl rounded-[20px] border border-border bg-[#faf7f2] p-6 shadow-search transition-all"
//       >
//         <div className="flex items-center justify-between pb-4">
//           <span className="font-mono text-xs uppercase tracking-eyebrow text-muted">
//             SEARCH ACROSS {retailerCount} RETAILERS
//           </span>
//           <button
//             type="button"
//             onClick={onClose}
//             aria-label="Close search"
//             className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-ink hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
//           >
//             <IconClose className="h-4 w-4" />
//           </button>
//         </div>

//         <form onSubmit={handleSubmit} className="mt-1">
//           <div className="flex items-center gap-2 rounded-full border border-border bg-surface p-1.5 pl-4 shadow-sm focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
//             <IconSearch className="h-5 w-5 text-muted shrink-0" />
//             <input
//               ref={inputRef}
//               type="search"
//               value={query}
//               onChange={(e) => setQuery(e.target.value)}
//               placeholder='Try "Palermo" or "running shoes"'
//               aria-label="Search shoes by brand, model or style"
//               className="w-full bg-transparent text-sm text-text placeholder:text-muted/70 focus:outline-none"
//             />
//             <button
//               type="submit"
//               className="rounded-full bg-ink px-5 py-2 text-xs font-semibold text-white transition-opacity hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent shrink-0"
//             >
//               Search
//             </button>
//           </div>
//         </form>

//         <div className="mt-5 flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
//           <span className="font-mono text-[11px] uppercase tracking-eyebrow text-muted">
//             Popular:
//           </span>
//           {POPULAR_CHIPS.map((chip) => (
//             <button
//               key={chip.label}
//               type="button"
//               onClick={() => handleChipClick(chip.href)}
//               className="rounded-full border border-border bg-surface/70 px-3 py-1 text-xs text-text hover:border-text hover:bg-surface transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
//             >
//               {chip.label}
//             </button>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconClose, IconSearch } from "./Icons";

type SearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
  retailerCount?: number;
};

const POPULAR_CHIPS = [
  { label: "Puma Palermo", href: "/search?q=Puma+Palermo" },
  { label: "Nike Air Max", href: "/search?q=Nike+Air+Max" },
  { label: "Skechers", href: "/search?q=Skechers" },
  { label: "Under $80", href: "/search?price=under80" },
];

export function SearchModal({
  isOpen,
  onClose,
  triggerRef,
  retailerCount = 5,
}: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open, and restore focus to trigger on close
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      triggerRef?.current?.focus();
    }
  }, [isOpen, triggerRef]);

  // Focus trap and Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusableElements.length) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    onClose();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/search");
    }
  }

  function handleChipClick(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search across retailers"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-ink/60 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-xl rounded-[20px] border border-border bg-[#faf7f2] p-6 shadow-search transition-all"
      >
        <div className="flex items-center justify-between pb-4">
          <span className="font-mono text-xs uppercase tracking-eyebrow text-muted">
            SEARCH ACROSS {retailerCount} RETAILERS
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-ink hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-1">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface p-1.5 pl-4 shadow-sm focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
            <IconSearch className="h-5 w-5 text-muted shrink-0" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Try "Palermo" or "running shoes"'
              aria-label="Search shoes by brand, model or style"
              className="w-full bg-transparent text-sm text-text placeholder:text-muted/70 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-ink px-5 py-2 text-xs font-semibold text-white transition-opacity hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent shrink-0"
            >
              Search
            </button>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
          <span className="font-mono text-[11px] uppercase tracking-eyebrow text-muted">
            Popular:
          </span>
          {POPULAR_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleChipClick(chip.href)}
              className="rounded-full border border-border bg-surface/70 px-3 py-1 text-xs text-text hover:border-text hover:bg-surface transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}