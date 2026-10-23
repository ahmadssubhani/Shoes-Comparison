import { NextResponse } from "next/server";
import { getProductIds } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ids = await getProductIds();
    return NextResponse.json({ ids });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load product ids";
    return NextResponse.json({ error: message, ids: [] }, { status: 500 });
  }
}
