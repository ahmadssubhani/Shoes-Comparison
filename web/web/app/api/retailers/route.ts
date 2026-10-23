import { NextResponse } from "next/server";
import { getRetailerStatuses } from "@/lib/data";

export async function GET() {
  try {
    const statuses = await getRetailerStatuses();
    return NextResponse.json({ data: statuses });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load retailers" },
      { status: 500 },
    );
  }
}

