import { NextResponse } from "next/server";
import { checkDbHealth } from "@/lib/data";

export async function GET() {
  try {
    const result = await checkDbHealth();
    return NextResponse.json({
      status: result.status,
      product_count: result.count,
      data_source: result.source,
      checked_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "degraded",
        error: "Database connectivity check failed",
        checked_at: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}

