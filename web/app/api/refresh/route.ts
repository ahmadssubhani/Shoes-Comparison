// import { NextResponse } from "next/server";

// export const dynamic = "force-dynamic";

// /**
//  * Live refresh endpoint.
//  *   POST -> starts the "Scrape shoe data" GitHub Action (unless one is already running)
//  *   GET  -> returns the state of the latest run so the button can show progress
//  *
//  * Vercel env vars needed:
//  *   GITHUB_TOKEN  fine-grained token, this repo only, "Actions: Read and write"
//  *   GITHUB_REPO   e.g. ahmadssubhani/Shoes-Comparison
//  * Optional: GITHUB_WORKFLOW (default scrape.yml), GITHUB_REF (default main), REFRESH_LIMIT (default 40)
//  */

// const API = "https://api.github.com";
// const MIN_GAP_MS = 5 * 60 * 1000; // don't allow a new run within 5 min of the last start

// type Run = {
//   id: number;
//   status: "queued" | "in_progress" | "completed" | string;
//   conclusion: string | null;
//   created_at: string;
//   updated_at: string;
//   html_url: string;
// };

// function config() {
//   const token = process.env.GITHUB_TOKEN?.trim();
//   const repo = process.env.GITHUB_REPO?.trim();
//   if (!token || !repo) return null;
//   return {
//     token,
//     repo,
//     workflow: process.env.GITHUB_WORKFLOW?.trim() || "scrape.yml",
//     ref: process.env.GITHUB_REF?.trim() || "main",
//     limit: process.env.REFRESH_LIMIT?.trim() || "40",
//   };
// }

// function headers(token: string) {
//   return {
//     Authorization: `Bearer ${token}`,
//     Accept: "application/vnd.github+json",
//     "X-GitHub-Api-Version": "2022-11-28",
//   };
// }

// async function latestRun(cfg: NonNullable<ReturnType<typeof config>>): Promise<Run | null> {
//   const res = await fetch(
//     `${API}/repos/${cfg.repo}/actions/workflows/${cfg.workflow}/runs?event=workflow_dispatch&per_page=1`,
//     { headers: headers(cfg.token), cache: "no-store" },
//   );
//   if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
//   const json = (await res.json()) as { workflow_runs?: Run[] };
//   return json.workflow_runs?.[0] ?? null;
// }

// function summarize(run: Run | null) {
//   if (!run) return { state: "idle" as const };
//   const active = run.status !== "completed";
//   return {
//     state: active
//       ? ("running" as const)
//       : run.conclusion === "success"
//         ? ("done" as const)
//         : ("failed" as const),
//     startedAt: run.created_at,
//     finishedAt: active ? null : run.updated_at,
//     runUrl: run.html_url,
//   };
// }

// export async function GET() {
//   const cfg = config();
//   if (!cfg) return NextResponse.json({ state: "unconfigured" }, { status: 200 });
//   try {
//     return NextResponse.json(summarize(await latestRun(cfg)));
//   } catch (err) {
//     return NextResponse.json(
//       { state: "error", message: err instanceof Error ? err.message : "Unknown error" },
//       { status: 502 },
//     );
//   }
// }

// export async function POST() {
//   const cfg = config();
//   if (!cfg) {
//     return NextResponse.json(
//       { state: "unconfigured", message: "GITHUB_TOKEN / GITHUB_REPO are not set on the server." },
//       { status: 500 },
//     );
//   }

//   try {
//     const current = await latestRun(cfg);
//     if (current) {
//       if (current.status !== "completed") return NextResponse.json(summarize(current)); // already running
//       if (Date.now() - Date.parse(current.created_at) < MIN_GAP_MS) {
//         return NextResponse.json({ ...summarize(current), message: "Data was refreshed a moment ago." });
//       }
//     }

//     const res = await fetch(
//       `${API}/repos/${cfg.repo}/actions/workflows/${cfg.workflow}/dispatches`,
//       {
//         method: "POST",
//         headers: { ...headers(cfg.token), "Content-Type": "application/json" },
//         body: JSON.stringify({ ref: cfg.ref, inputs: { limit: cfg.limit } }),
//       },
//     );
//     if (res.status !== 204) {
//       const text = await res.text();
//       return NextResponse.json(
//         { state: "error", message: `GitHub refused the request (${res.status}). ${text.slice(0, 200)}` },
//         { status: 502 },
//       );
//     }

//     // The run takes a few seconds to appear; hand back "running" straight away.
//     return NextResponse.json({ state: "running", startedAt: new Date().toISOString(), runUrl: null });
//   } catch (err) {
//     return NextResponse.json(
//       { state: "error", message: err instanceof Error ? err.message : "Unknown error" },
//       { status: 502 },
//     );
//   }
// }
import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Live refresh endpoint.
 *   POST -> starts the "Scrape shoe data" GitHub Action (unless one is already running)
 *   GET  -> returns the state of the latest run so the button can show progress
 *
 * Vercel env vars needed:
 *   GITHUB_TOKEN  fine-grained token, this repo only, "Actions: Read and write"
 *   GITHUB_REPO   e.g. ahmadssubhani/Shoes-Comparison
 * Optional: GITHUB_WORKFLOW (default scrape.yml), GITHUB_REF (default main), REFRESH_LIMIT (default 40)
 */

const API = "https://api.github.com";
const MIN_GAP_MS = 5 * 60 * 1000; // don't allow a new run within 5 min of the last start

type Run = {
  id: number;
  status: "queued" | "in_progress" | "completed" | string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
};


// ---------------------------------------------------------------------------
// Local development mode: no GitHub token needed. Runs the Python scraper on
// this machine (scrape -> merge -> upload to Supabase) when you click the button.
// Only active under `npm run dev`; needs `python` on PATH and SUPABASE_* in ../.env
// ---------------------------------------------------------------------------
type LocalJob = { running: boolean; startedAt: string | null; ok: boolean | null; log: string };
const g = globalThis as unknown as { __refreshJob?: LocalJob };
const job: LocalJob = (g.__refreshJob ??= { running: false, startedAt: null, ok: null, log: "" });

function runPython(args: string[], cwd: string): Promise<number> {
  return new Promise((resolve) => {
    const py = process.env.PYTHON_BIN?.trim() || "python";
    const child = spawn(py, args, { cwd, env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
    child.stdout.on("data", (d) => (job.log = (job.log + d).slice(-4000)));
    child.stderr.on("data", (d) => (job.log = (job.log + d).slice(-4000)));
    child.on("error", (e) => {
      job.log += `\n${e.message}`;
      resolve(1);
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

function startLocal() {
  const limit = process.env.REFRESH_LIMIT?.trim() || "40";
  const root = path.resolve(process.cwd(), "..");
  job.running = true;
  job.ok = null;
  job.log = "";
  job.startedAt = new Date().toISOString();
  void (async () => {
    const a = await runPython(["scraper/scrape_all.py", "--all", "--limit", limit], root);
    const b = a === 0 ? await runPython(["scraper/scrape_all.py", "--upload"], root) : a;
    job.ok = b === 0;
    job.running = false;
    console.log("[refresh] local scrape finished, ok =", job.ok, "\n", job.log.slice(-800));
  })();
}

function localSummary() {
  if (job.running) return { state: "running" as const, startedAt: job.startedAt, runUrl: null };
  if (job.ok === true) return { state: "done" as const, startedAt: job.startedAt, runUrl: null };
  if (job.ok === false)
    return { state: "failed" as const, startedAt: job.startedAt, runUrl: null, message: job.log.slice(-300) };
  return { state: "idle" as const };
}

const isDev = process.env.NODE_ENV !== "production";

function config() {
  const token = process.env.GITHUB_TOKEN?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  if (!token || !repo) return null;
  return {
    token,
    repo,
    workflow: process.env.GITHUB_WORKFLOW?.trim() || "scrape.yml",
    ref: process.env.GITHUB_REF?.trim() || "main",
    limit: process.env.REFRESH_LIMIT?.trim() || "40",
  };
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function latestRun(cfg: NonNullable<ReturnType<typeof config>>): Promise<Run | null> {
  const res = await fetch(
    `${API}/repos/${cfg.repo}/actions/workflows/${cfg.workflow}/runs?event=workflow_dispatch&per_page=1`,
    { headers: headers(cfg.token), cache: "no-store" },
  );
  if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
  const json = (await res.json()) as { workflow_runs?: Run[] };
  return json.workflow_runs?.[0] ?? null;
}

function summarize(run: Run | null) {
  if (!run) return { state: "idle" as const };
  const active = run.status !== "completed";
  return {
    state: active
      ? ("running" as const)
      : run.conclusion === "success"
        ? ("done" as const)
        : ("failed" as const),
    startedAt: run.created_at,
    finishedAt: active ? null : run.updated_at,
    runUrl: run.html_url,
  };
}

export async function GET() {
  const cfg = config();
  if (!cfg) {
    if (isDev) return NextResponse.json(localSummary());
    return NextResponse.json({ state: "unconfigured" }, { status: 200 });
  }
  try {
    return NextResponse.json(summarize(await latestRun(cfg)));
  } catch (err) {
    return NextResponse.json(
      { state: "error", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 },
    );
  }
}

export async function POST() {
  const cfg = config();
  if (!cfg && isDev) {
    if (!job.running) startLocal();
    return NextResponse.json(localSummary());
  }
  if (!cfg) {
    return NextResponse.json(
      { state: "unconfigured", message: "GITHUB_TOKEN / GITHUB_REPO are not set on the server." },
      { status: 500 },
    );
  }

  try {
    const current = await latestRun(cfg);
    if (current) {
      if (current.status !== "completed") return NextResponse.json(summarize(current)); // already running
      if (Date.now() - Date.parse(current.created_at) < MIN_GAP_MS) {
        return NextResponse.json({ ...summarize(current), message: "Data was refreshed a moment ago." });
      }
    }

    const res = await fetch(
      `${API}/repos/${cfg.repo}/actions/workflows/${cfg.workflow}/dispatches`,
      {
        method: "POST",
        headers: { ...headers(cfg.token), "Content-Type": "application/json" },
        body: JSON.stringify({ ref: cfg.ref, inputs: { limit: cfg.limit } }),
      },
    );
    if (res.status !== 204) {
      const text = await res.text();
      return NextResponse.json(
        { state: "error", message: `GitHub refused the request (${res.status}). ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    // The run takes a few seconds to appear; hand back "running" straight away.
    return NextResponse.json({ state: "running", startedAt: new Date().toISOString(), runUrl: null });
  } catch (err) {
    return NextResponse.json(
      { state: "error", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 },
    );
  }
}