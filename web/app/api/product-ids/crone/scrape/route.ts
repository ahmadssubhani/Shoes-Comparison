import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Vercel Cron entry point (see web/vercel.json).
 *
 * The scraper is Python and waits 2s between requests, so a full run takes far
 * longer than a Vercel function is allowed to live. This route therefore only
 * *starts* the "Scrape shoe data" GitHub Actions workflow, which runs the scraper
 * and uploads the results to Supabase. The site reads from Supabase, so new
 * prices appear as soon as the workflow finishes.
 *
 * Required environment variables (Vercel -> Project -> Settings -> Environment Variables):
 *   CRON_SECRET          any long random string; Vercel sends it as a Bearer token
 *   GH_DISPATCH_TOKEN    fine-grained GitHub token, repo access to this repository,
 *                        permission "Actions: Read and write"
 * Optional:
 *   GH_REPO              default "ahmadssubhani/Shoes-Comparison"
 *   GH_WORKFLOW_FILE     default "scrape.yml"
 *   GH_REF               default "main" (the branch the workflow runs on)
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not set" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.GH_DISPATCH_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: false, error: "GH_DISPATCH_TOKEN is not set" }, { status: 500 });
  }

  const repo = process.env.GH_REPO || "ahmadssubhani/Shoes-Comparison";
  const workflow = process.env.GH_WORKFLOW_FILE || "scrape.yml";
  const ref = process.env.GH_REF || "main";

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref }),
      cache: "no-store",
    },
  );

  // GitHub answers 204 No Content when the workflow run has been queued.
  if (res.status !== 204) {
    const detail = await res.text().catch(() => "");
    return NextResponse.json(
      { ok: false, status: res.status, error: "GitHub dispatch failed", detail: detail.slice(0, 300) },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, triggered: workflow, ref, at: new Date().toISOString() });
}