// "use client";

// import Link from "next/link";
// import { MAX_COMPARE, useAppState } from "./AppState";

// export function CompareBar() {
//   const { compare, clearCompare, removeCompare } = useAppState();
//   if (!compare.length) return null;

//   const ready = compare.length >= 2;
//   const remaining = MAX_COMPARE - compare.length;

//   return (
//     <>
//       <div aria-hidden className="h-20 sm:h-16" />
//       <aside
//         aria-label="Product comparison tray"
//         className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md py-3 px-4 sm:px-6 shadow-2xl"
//       >
//         <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
//           <div className="flex min-w-0 flex-1 items-center gap-3">
//             <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-white">
//               {compare.length}
//             </span>
//             <div className="min-w-0">
//               <p className="text-sm font-medium text-ink">
//                 {compare.length === 1 ? (
//                   <span>
//                     <strong>1 shoe</strong> selected · add at least 1 more
//                   </span>
//                 ) : (
//                   <span>
//                     <strong>{compare.length} shoes</strong> selected · ready to compare
//                     {remaining > 0 ? ` (up to ${MAX_COMPARE})` : ` (max ${MAX_COMPARE})`}
//                   </span>
//                 )}
//               </p>
//               <div className="mt-1 flex flex-wrap gap-1.5">
//                 {compare.map((id, index) => (
//                   <button
//                     key={id}
//                     type="button"
//                     onClick={() => removeCompare(id)}
//                     title="Remove from comparison"
//                     className="inline-flex items-center gap-1 rounded-full border border-border bg-bg px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted hover:border-ink hover:text-ink"
//                   >
//                     Pair {index + 1}
//                     <span aria-hidden>×</span>
//                   </button>
//                 ))}
//               </div>
//             </div>
//           </div>

//           <div className="flex items-center gap-3">
//             <button
//               type="button"
//               onClick={clearCompare}
//               className="rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-mono uppercase tracking-wider text-muted hover:text-ink hover:border-ink transition-colors"
//             >
//               Clear all
//             </button>

//             {ready ? (
//               <Link
//                 href={`/compare?ids=${compare.join(",")}`}
//                 className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-accent/90 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
//               >
//                 <span>Compare now ({compare.length})</span>
//                 <span>→</span>
//               </Link>
//             ) : (
//               <button
//                 type="button"
//                 disabled
//                 title="Select at least 2 shoes to compare"
//                 className="cursor-not-allowed rounded-full bg-border px-5 py-2 text-sm font-semibold text-muted opacity-80"
//               >
//                 Compare now (select 1 more)
//               </button>
//             )}
//           </div>
//         </div>
//       </aside>
//     </>
//   );
// }

"use client";

import Image from "next/image";
import Link from "next/link";
import { MAX_COMPARE, useAppState } from "./AppState";

export function CompareBar() {
  const { compare, compareMeta, clearCompare, removeCompare } = useAppState();
  if (!compare.length) return null;

  const ready = compare.length >= 2;

  return (
    <>
      {/* Keeps the footer clear of the floating bar */}
      <div aria-hidden className="h-24" />

      <aside
        aria-label="Product comparison tray"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-3"
      >
        <div className="compare-bar-in pointer-events-auto flex w-full max-w-[34rem] items-center gap-3 rounded-2xl border border-white/10 bg-ink px-3.5 py-2.5 text-white shadow-[0_18px_40px_-12px_rgba(24,24,19,0.55)] sm:w-auto sm:min-w-[31rem] sm:gap-5 sm:px-4">
          {/* Count */}
          <div className="flex shrink-0 items-center gap-2">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-lime" />
            <p className="text-[13px] font-semibold leading-none">
              {compare.length} / {MAX_COMPARE}
              <span className="ml-1 font-semibold">selected</span>
              <span className="ml-2 hidden text-[11px] font-normal text-white/45 sm:inline">
                add up to {MAX_COMPARE}
              </span>
            </p>
          </div>

          {/* Thumbnails: click one to remove it */}
          <ul className="flex min-w-0 items-center -space-x-2">
            {compare.map((id, index) => {
              const meta = compareMeta[id];
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => removeCompare(id)}
                    title={meta?.title ? `Remove ${meta.title}` : "Remove from comparison"}
                    aria-label={meta?.title ? `Remove ${meta.title} from comparison` : `Remove pair ${index + 1}`}
                    className="group relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white font-mono text-[10px] font-bold text-ink ring-2 ring-ink transition-transform hover:z-10 hover:scale-110"
                  >
                    {meta?.imageUrl ? (
                      <Image
                        src={meta.imageUrl}
                        alt=""
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                    <span
                      aria-hidden
                      className="absolute inset-0 flex items-center justify-center bg-ink/70 text-sm font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      ×
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Actions */}
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={clearCompare}
              className="text-[12px] font-medium text-white/70 underline underline-offset-4 transition-colors hover:text-white"
            >
              Clear
            </button>

            {ready ? (
              <Link
                href={`/compare?ids=${compare.join(",")}`}
                className="rounded-lg bg-lime px-3.5 py-1.5 text-[12px] font-bold text-ink transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
              >
                Compare now
              </Link>
            ) : (
              <button
                type="button"
                disabled
                title="Select at least 2 shoes to compare"
                className="cursor-not-allowed rounded-lg bg-white/10 px-3.5 py-1.5 text-[12px] font-semibold text-white/50"
              >
                Add 1 more
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}