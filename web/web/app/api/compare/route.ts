import { NextRequest, NextResponse } from "next/server";
import { getProductsByIds } from "@/lib/data";
import { formatPrice } from "@/lib/currency";
import type { AiComparisonResult } from "@/lib/types";

// In-memory cache keyed by sorted id list, 24h TTL
type CacheEntry = {
  result: AiComparisonResult;
  expiresAt: number;
};
const compareCache = new Map<string, CacheEntry>();

// In-memory rate limiting: 30 per 10 minutes per IP
type RateLimitEntry = {
  count: number;
  resetAt: number;
};
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 30;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
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
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Comparison request limit reached. Please wait a few moments." },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    const forceRefresh = Boolean(body?.forceRefresh);

    if (ids.length < 2) {
      return NextResponse.json(
        { error: "At least two product IDs are required for comparison." },
        { status: 400 },
      );
    }

    const sortedIds = [...ids].sort();
    const cacheKey = sortedIds.join("::");
    const now = Date.now();

    if (!forceRefresh && compareCache.has(cacheKey)) {
      const cached = compareCache.get(cacheKey)!;
      if (now < cached.expiresAt) {
        return NextResponse.json({ data: cached.result, cached: true });
      }
    }

    const products = await getProductsByIds(sortedIds);
    if (products.length < 2) {
      return NextResponse.json(
        { error: "Could not find products for comparison." },
        { status: 404 },
      );
    }

    // Format products for AI synthesis
    const comparisonData = products.map((p, idx) => ({
      shoe_number: idx + 1,
      brand: p.brand || "Not listed",
      title: p.cleanTitle || "Not listed",
      category: p.category || "Not listed",
      lowest_price_usd: p.minPrice != null ? `$${p.minPrice.toFixed(2)}` : "Not listed",
      max_saving_usd: p.maxSaving != null ? `$${p.maxSaving.toFixed(2)}` : "None",
      store_count: p.storeCount,
      stores_listed: p.distinctStores.join(", "),
      offers: p.offers.map((o) => ({
        store: o.store,
        price_usd: o.price != null ? `$${o.price.toFixed(2)}` : "Not listed",
        original_price_usd:
          o.compareAtPrice != null ? `$${o.compareAtPrice.toFixed(2)}` : "Not listed",
        discount_percent: o.discountPct != null ? `${o.discountPct}%` : "None",
        in_stock: o.inStock === true ? "In stock" : o.inStock === false ? "Out of stock" : "Unknown",
        sizes_available: o.sizes.length > 0 ? o.sizes.join(", ") : "Not listed",
      })),
    }));

    const systemPrompt = `You are an expert, objective shoe comparison assistant for ShoeScope.
Follow these strict instructions:
1. Compare all ${products.length} shoes provided in the dataset.
2. Use ONLY the provided product data snapshot below. NEVER invent materials, cushioning tech, or specs not listed.
3. For any missing info, write "Not listed".
4. Stay neutral, concise, and factual. All prices are USD snapshots from public store listings.
5. Respond with ONLY valid JSON adhering strictly to this schema:
{
  "summary": "2-3 sentences providing an overview comparison across all ${products.length} shoes and their visible store pricing in USD.",
  "key_differences": ["3 to 5 concise bullet points highlighting prices, discounts, store availability, and sizing differences among the shoes."],
  "best_value": "1-2 sentences clearly identifying which shoe and store offer represents the best visible value and why based strictly on listed prices.",
  "caveats": ["2-3 concise notes on data limitations (e.g. stock status, missing size info on specific stores, checkout fees not included)."]
}`;

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    let geminiResult: AiComparisonResult | null = null;

    if (apiKey) {
      // List of candidate models to try in case of temporary provider spikes (503/404)
      const primaryModel = process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";
      const candidateModels = Array.from(new Set([primaryModel, "gemini-flash-latest", "gemini-2.5-flash-lite"]));

      for (const model of candidateModels) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
            model,
          )}:generateContent?key=${apiKey}`;

          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(15000), // 15s timeout
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `${systemPrompt}\n\nDATA SNAPSHOT:\n${JSON.stringify(
                        comparisonData,
                        null,
                        2,
                      )}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json",
              },
            }),
          });

          if (!response.ok) {
            const errText = await response.text().catch(() => "");
            console.warn(`Gemini API error with model ${model}:`, response.status, errText);
            continue; // try next candidate model
          }

          const resJson = await response.json();
          const candidateText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";

          // Defensively parse JSON (strip markdown code fences)
          const cleanedText = candidateText
            .replace(/^```(json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

          const parsed = JSON.parse(cleanedText);
          if (parsed.summary && parsed.key_differences && parsed.best_value) {
            geminiResult = {
              summary: String(parsed.summary),
              key_differences: Array.isArray(parsed.key_differences)
                ? parsed.key_differences.map(String)
                : [],
              best_value: String(parsed.best_value),
              caveats: Array.isArray(parsed.caveats)
                ? parsed.caveats.map(String)
                : ["Verify pricing and stock directly on retailer website."],
            };
            break; // Successfully obtained from Gemini!
          }
        } catch (callErr) {
          console.warn(`Call failed for model ${model}:`, callErr);
        }
      }
    }

    // Fallback synthesis if Gemini was unreachable
    if (!geminiResult) {
      const sortedByPrice = [...products].sort((a, b) => (a.minPrice ?? 999) - (b.minPrice ?? 999));
      const lowestProduct = sortedByPrice[0];
      const highestSavingProduct = [...products].sort((a, b) => (b.maxSaving ?? 0) - (a.maxSaving ?? 0))[0];

      geminiResult = {
        summary: `Comparing ${products.map((p) => `${p.cleanTitle} (${p.brand})`).join(", ")}. Prices range from ${formatPrice(
          lowestProduct.minPrice,
        )} up to ${formatPrice(sortedByPrice[sortedByPrice.length - 1].minPrice)} across tracked US retailers.`,
        key_differences: products.map((p) => {
          const savingText = p.maxSaving && p.maxSaving > 0 ? ` (up to ${formatPrice(p.maxSaving)} discount)` : "";
          return `${p.cleanTitle}: Starting at ${formatPrice(p.minPrice)}${savingText} across ${p.storeCount} retailer(s) [${p.distinctStores.join(", ")}].`;
        }),
        best_value: `Based on current visible prices, ${lowestProduct.cleanTitle} offers the lowest entry price at ${formatPrice(
          lowestProduct.minPrice,
        )}${highestSavingProduct && highestSavingProduct.maxSaving ? `, while ${highestSavingProduct.cleanTitle} features the largest visible discount of ${formatPrice(highestSavingProduct.maxSaving)}` : ""}.`,
        caveats: [
          "Prices shown are USD public snapshots; inventory and sizes vary by merchant.",
          "Check the individual retailer link to confirm checkout eligibility and delivery fees.",
        ],
      };
    }

    // Cache result for 24 hours
    compareCache.set(cacheKey, {
      result: geminiResult,
      expiresAt: now + 24 * 60 * 60 * 1000,
    });

    return NextResponse.json({ data: geminiResult });
  } catch (err: any) {
    console.error("Compare API exception:", err);
    return NextResponse.json(
      { error: "AI comparison synthesis encountered an error" },
      { status: 500 },
    );
  }
}
