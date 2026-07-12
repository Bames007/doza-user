// app/api/centers/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  ref,
  query as firebaseQuery,
  orderByChild,
  startAt,
  endAt,
  limitToFirst,
  get,
} from "firebase/database";
import { db } from "@/app/utils/firebaseConfig";
import logger from "@/app/utils/logger";
import { rateLimiter } from "@/app/lib/rateLimit";
import { cache } from "@/app/lib/cache";
import { z } from "zod";

// ---------- HELPERS ----------
function getDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (val: number) => (val * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ---------- VALIDATION ----------
const searchQuerySchema = z.object({
  query: z.string().optional().default(""),
  type: z.enum(["service", "drug", "test"]).optional().default("service"),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radius: z.coerce.number().optional().default(50),
});

// ---------- GET ENDPOINT ----------
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID required" },
        { status: 401 },
      );
    }

    // 2. Validate query parameters
    const { searchParams } = new URL(request.url);
    const parsed = searchQuerySchema.safeParse(
      Object.fromEntries(searchParams),
    );
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid parameters",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { query, type, lat, lng, radius } = parsed.data;

    // 3. Rate limit (20 searches per minute per user)
    const rateKey = `${userId}:centers-search:${query}:${type}`;
    if (!rateLimiter.check(rateKey, 20, 60)) {
      logger.warn({ userId, query }, "Search rate limit exceeded");
      return NextResponse.json(
        { success: false, error: "Too many search requests" },
        { status: 429 },
      );
    }

    // 4. Cache check (per query+type+location, 30 seconds)
    const cacheKey = `search:${query}:${type}:${lat}:${lng}:${radius}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      logger.debug({ query, type }, "Search results from cache");
      return NextResponse.json({ success: true, data: cached });
    }

    logger.info({ query, type, lat, lng, radius }, "Performing center search");

    // 5. Determine which search index to query (flat pre‑built index)
    const indexPaths: string[] = [];
    if (type === "service") indexPaths.push("searchIndex/service");
    else if (type === "drug") indexPaths.push("searchIndex/drug");
    else if (type === "test") indexPaths.push("searchIndex/test");
    else {
      // fallback: search all
      indexPaths.push(
        "searchIndex/service",
        "searchIndex/drug",
        "searchIndex/test",
      );
    }

    let allItems: any[] = [];

    // 6. Query each index using Firebase's indexed prefix search
    for (const path of indexPaths) {
      const refPath = ref(db, path);
      // Only query if we have a search term; otherwise get all (limit 100)
      let q;
      if (query && query.trim().length >= 2) {
        const qLower = query.toLowerCase().trim();
        // ✅ Renamed to firebaseQuery to avoid conflict
        q = firebaseQuery(
          refPath,
          orderByChild("searchText"),
          startAt(qLower),
          endAt(qLower + "\uf8ff"),
          limitToFirst(50),
        );
      } else {
        // No query: just get first 50 (e.g., for popular items)
        q = firebaseQuery(
          refPath,
          orderByChild("searchText"),
          limitToFirst(50),
        );
      }
      const snapshot = await get(q);
      if (snapshot.exists()) {
        const data = snapshot.val();
        for (const [key, item] of Object.entries(data)) {
          allItems.push({ id: key, ...(item as any) });
        }
      }
    }

    // 7. Remove duplicates (by centerId+itemId)
    const uniqueMap = new Map();
    for (const item of allItems) {
      const key = `${item.centerId}|${item.itemId}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    }
    allItems = Array.from(uniqueMap.values());

    // 8. Distance filter and group by center
    const grouped: Record<string, any> = {};
    for (const item of allItems) {
      const dist = getDistance(lat, lng, item.lat || 0, item.lng || 0);
      if (dist > radius) continue;

      const centerKey = item.centerId;
      if (!grouped[centerKey]) {
        grouped[centerKey] = {
          centerId: item.centerId,
          centerName: item.centerName,
          centerType: item.centerType,
          location: { lat: item.lat, lng: item.lng },
          address: item.address || null,
          phone: item.phone || null,
          email: item.email || null,
          operatingHours: item.operatingHours || null,
          distance: Math.round(dist * 10) / 10,
          matches: [],
        };
      }

      // Avoid duplicate matches in same center
      const exists = grouped[centerKey].matches.some(
        (m: any) => m.id === item.itemId && m.type === item.itemType,
      );
      if (!exists) {
        grouped[centerKey].matches.push({
          id: item.itemId,
          name: item.name,
          price: item.displayPrice || item.price || 0,
          description: item.description || "",
          type: item.itemType,
          ...(item.unit && { unit: item.unit }),
          ...(item.prescriptionRequired !== undefined && {
            prescriptionRequired: item.prescriptionRequired,
          }),
        });
      }
    }

    // 9. Sort centers by distance
    const results = Object.values(grouped).sort(
      (a: any, b: any) => a.distance - b.distance,
    );

    // 10. Cache the results (30 seconds TTL)
    cache.set(cacheKey, results, 30);

    logger.info(
      {
        query,
        type,
        matchedItems: allItems.length,
        resultCount: results.length,
      },
      "Search completed",
    );

    return NextResponse.json({
      success: true,
      data: results.slice(0, 50), // limit to 50 centers
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ error: msg }, "Search failed");
    return NextResponse.json(
      { success: false, error: "Unable to perform search" },
      { status: 500 },
    );
  }
}
