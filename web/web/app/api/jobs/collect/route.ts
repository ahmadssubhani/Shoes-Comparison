import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      message:
        "Collection is run with the Python scraper (PowerShell or the GitHub Actions schedule), not from the website.",
    },
    { status: 501 },
  );
}

