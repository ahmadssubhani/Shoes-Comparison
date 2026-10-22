import { NextRequest, NextResponse } from "next/server";
import { getProduct } from "@/lib/data";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const product = await getProduct(id);

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: {
        ...product,
        match_level: product.matchLevel,
        distinct_stores: product.distinctStores,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error retrieving product" },
      { status: 500 },
    );
  }
}

