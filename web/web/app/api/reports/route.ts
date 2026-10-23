import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Rate limiting: 5 reports per 10 minutes per IP
const reportRateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

function checkReportRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = reportRateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    reportRateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!checkReportRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many problem reports. Please try again in a few minutes." },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { productId, offerId, kind, note } = body;

    const validKinds = ["mismatch", "stale_price", "other"];
    if (!kind || !validKinds.includes(kind)) {
      return NextResponse.json(
        { error: "Invalid report kind. Must be 'mismatch', 'stale_price', or 'other'." },
        { status: 400 },
      );
    }

    if (note && typeof note === "string" && note.length > 500) {
      return NextResponse.json(
        { error: "Note cannot exceed 500 characters." },
        { status: 400 },
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    if (url && anon) {
      const client = createClient(url, anon);
      // Insert with anon key, without .select() (minimal return)
      const { error } = await client.from("reports").insert({
        product_id: productId ? String(productId) : null,
        offer_id: offerId ? String(offerId) : null,
        kind: String(kind),
        note: note ? String(note).trim() : null,
      });

      if (error) {
        console.error("Supabase report insert error:", error);
        return NextResponse.json(
          { error: "Failed to store report in database" },
          { status: 500 },
        );
      }
    } else {
      console.log("Mock report stored locally:", { productId, offerId, kind, note });
    }

    return NextResponse.json(
      { success: true, message: "Report submitted successfully." },
      { status: 201 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

