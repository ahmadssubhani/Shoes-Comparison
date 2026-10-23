// // "use client";

// // import { useState } from "react";
// // import { useRouter } from "next/navigation";

// // export function RefreshButton({ latestChecked }: { latestChecked: string | null }) {
// //   const router = useRouter();
// //   const [isRefreshing, setIsRefreshing] = useState(false);

// //   function formatTime(iso: string | null) {
// //     if (!iso) return "Today";
// //     try {
// //       const d = new Date(iso);
// //       const day = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
// //       const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
// //       return `${day}, ${time}`;
// //     } catch {
// //       return "Today";
// //     }
// //   }

// //   function handleRefresh() {
// //     setIsRefreshing(true);
// //     router.refresh();
// //     setTimeout(() => {
// //       setIsRefreshing(false);
// //     }, 600);
// //   }

// //   return (
// //     <div className="flex flex-wrap items-center gap-3">
// //       <span className="font-mono text-xs uppercase tracking-wider text-muted">
// //         Updated {formatTime(latestChecked)}
// //       </span>
// //       <button
// //         type="button"
// //         onClick={handleRefresh}
// //         disabled={isRefreshing}
// //         className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-mono text-ink shadow-sm hover:border-ink transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
// //       >
// //         <span className={`inline-block ${isRefreshing ? "animate-spin" : ""}`}>↻</span>
// //         <span>Fetch latest data</span>
// //       </button>
// //     </div>
// //   );
// // }

// "use client";

// import { useCallback, useEffect, useRef, useState } from "react";
// import { useRouter } from "next/navigation";

// type Phase = "idle" | "running" | "done" | "failed" | "unconfigured";

// type RefreshState = {
//   state: "idle" | "running" | "done" | "failed" | "unconfigured" | "error";
//   startedAt?: string;
//   message?: string;
// };

// const POLL_MS = 15_000;

// function formatChecked(iso: string | null): string {
//   if (!iso) return "Updated recently";
//   const d = new Date(iso);
//   if (Number.isNaN(d.getTime())) return "Updated recently";
//   const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
//   const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
//   return `Updated ${day}, ${time}`;
// }

// function elapsed(startedAt: string | null, now: number): string {
//   if (!startedAt) return "";
//   const secs = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
//   const m = Math.floor(secs / 60);
//   const s = String(secs % 60).padStart(2, "0");
//   return `${m}:${s}`;
// }

// export function RefreshButton({ latestChecked }: { latestChecked: string | null }) {
//   const router = useRouter();
//   const [phase, setPhase] = useState<Phase>("idle");
//   const [startedAt, setStartedAt] = useState<string | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [now, setNow] = useState(() => Date.now());
//   const [label, setLabel] = useState(() => formatChecked(null));
//   const wasRunning = useRef(false);

//   // Format the timestamp in the browser's timezone, after mount (avoids hydration mismatch).
//   useEffect(() => {
//     setLabel(formatChecked(latestChecked));
//   }, [latestChecked]);

//   const apply = useCallback(
//     (data: RefreshState) => {
//       if (data.state === "running") {
//         wasRunning.current = true;
//         setPhase("running");
//         setStartedAt((prev) => prev ?? data.startedAt ?? new Date().toISOString());
//         setError(null);
//       } else if (data.state === "done") {
//         if (wasRunning.current) {
//           wasRunning.current = false;
//           setPhase("done");
//           // Server keeps a 60 s catalog cache, so refresh now and once more after it expires.
//           router.refresh();
//           setTimeout(() => router.refresh(), 62_000);
//           setTimeout(() => setPhase("idle"), 6_000);
//         } else {
//           setPhase("idle");
//         }
//         setStartedAt(null);
//       } else if (data.state === "failed") {
//         wasRunning.current = false;
//         setPhase("failed");
//         setStartedAt(null);
//         setError("The last refresh did not finish. Try again.");
//       } else if (data.state === "unconfigured") {
//         setPhase("unconfigured");
//       } else if (data.state === "error") {
//         setError(data.message ?? "Could not reach the refresh service.");
//       } else {
//         setPhase("idle");
//       }
//     },
//     [router],
//   );

//   // On page load, pick up a run that is already in progress.
//   useEffect(() => {
//     let cancelled = false;
//     fetch("/api/refresh", { cache: "no-store" })
//       .then((r) => r.json())
//       .then((data: RefreshState) => {
//         if (!cancelled && data.state === "running") apply(data);
//       })
//       .catch(() => {});
//     return () => {
//       cancelled = true;
//     };
//   }, [apply]);

//   // Poll while running + tick the timer.
//   useEffect(() => {
//     if (phase !== "running") return;
//     const tick = setInterval(() => setNow(Date.now()), 1000);
//     const poll = setInterval(async () => {
//       try {
//         const res = await fetch("/api/refresh", { cache: "no-store" });
//         apply((await res.json()) as RefreshState);
//       } catch {
//         /* keep polling */
//       }
//     }, POLL_MS);
//     return () => {
//       clearInterval(tick);
//       clearInterval(poll);
//     };
//   }, [phase, apply]);

//   async function start() {
//     setError(null);
//     setPhase("running");
//     setStartedAt(new Date().toISOString());
//     wasRunning.current = true;
//     try {
//       const res = await fetch("/api/refresh", { method: "POST" });
//       const data = (await res.json()) as RefreshState;
//       if (data.state === "running") apply(data);
//       else if (data.state === "done" || data.state === "idle") {
//         wasRunning.current = false;
//         setPhase("idle");
//         setStartedAt(null);
//         if (data.message) setError(data.message);
//       } else apply(data);
//     } catch {
//       wasRunning.current = false;
//       setPhase("failed");
//       setError("Could not start the refresh.");
//     }
//   }

//   const running = phase === "running";

//   return (
//     <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
//       <span className="font-mono text-[11px] text-muted" suppressHydrationWarning>
//         {running
//           ? `Fetching live data… ${elapsed(startedAt, now)}`
//           : phase === "done"
//             ? "Fresh data loaded"
//             : label}
//       </span>
//       <button
//         type="button"
//         onClick={start}
//         disabled={running || phase === "unconfigured"}
//         className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 font-semibold text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
//       >
//         <span aria-hidden className={running ? "inline-block animate-spin" : "inline-block"}>
//           ↻
//         </span>
//         {running ? "Fetching…" : "Fetch latest data"}
//       </button>
//       {error ? <span className="text-[11px] text-red-600">{error}</span> : null}
//       {phase === "unconfigured" ? (
//         <span className="text-[11px] text-muted">Set GITHUB_TOKEN and GITHUB_REPO on Vercel to enable.</span>
//       ) : null}
//     </div>
//   );
// }
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Phase = "idle" | "running" | "done" | "failed" | "unconfigured";

type RefreshState = {
  state: "idle" | "running" | "done" | "failed" | "unconfigured" | "error";
  startedAt?: string;
  message?: string;
};

const POLL_MS = 15_000;

function formatChecked(iso: string | null): string {
  if (!iso) return "Updated recently";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Updated recently";
  const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `Updated ${day}, ${time}`;
}

function elapsed(startedAt: string | null, now: number): string {
  if (!startedAt) return "";
  const secs = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function RefreshButton({ latestChecked }: { latestChecked: string | null }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [label, setLabel] = useState(() => formatChecked(null));
  const wasRunning = useRef(false);

  // Format the timestamp in the browser's timezone, after mount (avoids hydration mismatch).
  useEffect(() => {
    setLabel(formatChecked(latestChecked));
  }, [latestChecked]);

  const apply = useCallback(
    (data: RefreshState) => {
      if (data.state === "running") {
        wasRunning.current = true;
        setPhase("running");
        setStartedAt((prev) => prev ?? data.startedAt ?? new Date().toISOString());
        setError(null);
      } else if (data.state === "done") {
        if (wasRunning.current) {
          wasRunning.current = false;
          setPhase("done");
          // Server keeps a 60 s catalog cache, so refresh now and once more after it expires.
          router.refresh();
          setTimeout(() => router.refresh(), 62_000);
          setTimeout(() => setPhase("idle"), 6_000);
        } else {
          setPhase("idle");
        }
        setStartedAt(null);
      } else if (data.state === "failed") {
        wasRunning.current = false;
        setPhase("failed");
        setStartedAt(null);
        setError(data.message ? `Refresh failed: ${data.message}` : "The last refresh did not finish. Try again.");
      } else if (data.state === "unconfigured") {
        setPhase("unconfigured");
      } else if (data.state === "error") {
        wasRunning.current = false;
        setPhase("failed");
        setStartedAt(null);
        setError(data.message ?? "Could not reach the refresh service.");
      } else {
        setPhase("idle");
      }
    },
    [router],
  );

  // On page load, pick up a run that is already in progress.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/refresh", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: RefreshState) => {
        if (!cancelled && data.state === "running") apply(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apply]);

  // Poll while running + tick the timer.
  useEffect(() => {
    if (phase !== "running") return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/refresh", { cache: "no-store" });
        apply((await res.json()) as RefreshState);
      } catch {
        /* keep polling */
      }
    }, POLL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [phase, apply]);

  async function start() {
    setError(null);
    setPhase("running");
    setStartedAt(new Date().toISOString());
    wasRunning.current = true;
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const data = (await res.json()) as RefreshState;
      if (data.state === "running") apply(data);
      else if (data.state === "done" || data.state === "idle") {
        wasRunning.current = false;
        setPhase("idle");
        setStartedAt(null);
        if (data.message) setError(data.message);
      } else apply(data);
    } catch {
      wasRunning.current = false;
      setPhase("failed");
      setError("Could not start the refresh.");
    }
  }

  const running = phase === "running";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="font-mono text-[11px] text-muted" suppressHydrationWarning>
        {running
          ? `Fetching live data… ${elapsed(startedAt, now)}`
          : phase === "done"
            ? "Fresh data loaded"
            : label}
      </span>
      <button
        type="button"
        onClick={start}
        disabled={running || phase === "unconfigured"}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 font-semibold text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span aria-hidden className={running ? "inline-block animate-spin" : "inline-block"}>
          ↻
        </span>
        {running ? "Fetching…" : "Fetch latest data"}
      </button>
      {error ? <span className="text-[11px] text-red-600">{error}</span> : null}
      {phase === "unconfigured" ? (
        <span className="text-[11px] text-muted">Set GITHUB_TOKEN and GITHUB_REPO to enable.</span>
      ) : null}
    </div>
  );
}