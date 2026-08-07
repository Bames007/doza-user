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

// ---------- Helpers ----------
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

// ---------- Validation ----------
const searchQuerySchema = z.object({
  query: z.string().optional().default(""),
  type: z.enum(["service", "drug", "test"]).optional().default("service"),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radius: z.coerce.number().optional().default(50),
});

// ---------- GET Endpoint ----------
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID required" },
        { status: 401 },
      );
    }

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

    const rateKey = `${userId}:center-search:${query}:${type}`;
    if (!rateLimiter.check(rateKey, 20, 60)) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429 },
      );
    }

    const cacheKey = `search:${query}:${type}:${lat}:${lng}:${radius}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    // ─── Build index paths based on type ─────────────────────────
    let allItems: any[] = [];
    const indexPaths =
      type === "service"
        ? ["searchIndex/service"]
        : type === "drug"
          ? ["searchIndex/drug"]
          : type === "test"
            ? ["searchIndex/test"]
            : ["searchIndex/service", "searchIndex/drug", "searchIndex/test"];

    let indexUsed = false;

    // ─── Try to use the index (if it exists) ──────────────────────
    for (const path of indexPaths) {
      const refPath = ref(db, path);
      // First, check if the index node exists
      const existsSnap = await get(refPath);
      if (!existsSnap.exists()) {
        continue; // index path doesn't exist, skip
      }

      // Now try to query it – if the index is not defined, this will throw
      let fullQuery;
      if (query && query.trim().length >= 2) {
        const qLower = query.toLowerCase().trim();
        fullQuery = firebaseQuery(
          refPath,
          orderByChild("searchText"),
          startAt(qLower),
          endAt(qLower + "\uf8ff"),
          limitToFirst(50),
        );
      } else {
        fullQuery = firebaseQuery(
          refPath,
          orderByChild("searchText"),
          limitToFirst(50),
        );
      }
      try {
        const snap = await get(fullQuery);
        if (snap.exists()) {
          indexUsed = true;
          const data = snap.val();
          for (const [key, item] of Object.entries(data)) {
            allItems.push({ id: key, ...(item as any) });
          }
        }
      } catch (err: any) {
        // If the error is about missing index, log and continue – fallback will handle it
        if (err.message && err.message.includes("Index not defined")) {
          logger.warn({ path }, "Missing index, falling back to scan");
        } else {
          // Re‑throw other errors
          throw err;
        }
      }
    }

    // ─── Fallback: scan all centers ──────────────────────────────
    if (!indexUsed || allItems.length === 0) {
      logger.warn({ query, type }, "No index used or empty, scanning centers");
      const centersRef = ref(db, "doza_centers");
      const centersSnap = await get(centersRef);
      if (centersSnap.exists()) {
        const allCenters = centersSnap.val();
        for (const [centerId, center] of Object.entries(allCenters) as any) {
          const location = center.location;
          if (
            !location ||
            typeof location.lat !== "number" ||
            typeof location.lng !== "number"
          )
            continue;

          let containers: { node: string; itemType: string }[] = [];
          if (type === "service") {
            containers.push({ node: "services", itemType: "service" });
          } else if (type === "drug") {
            containers.push({ node: "products", itemType: "drug" });
            if (center.inventory?.pharmacy) {
              containers.push({ node: "inventory/pharmacy", itemType: "drug" });
            }
          } else if (type === "test") {
            containers.push({ node: "tests", itemType: "test" });
            if (center.lab_tests) {
              containers.push({ node: "lab_tests", itemType: "test" });
            }
          } else {
            containers = [
              { node: "services", itemType: "service" },
              { node: "products", itemType: "drug" },
              { node: "inventory/pharmacy", itemType: "drug" },
              { node: "tests", itemType: "test" },
              { node: "lab_tests", itemType: "test" },
            ];
          }

          const uniqueContainers = Array.from(
            new Map(containers.map((c) => [c.node, c])).values(),
          );

          for (const { node, itemType } of uniqueContainers) {
            const nodeData = node.includes("/")
              ? node
                  .split("/")
                  .reduce((obj: any, key: string) => obj?.[key], center)
              : center[node];
            if (!nodeData || typeof nodeData !== "object") continue;

            for (const [itemId, item] of Object.entries(nodeData) as any) {
              if (typeof item !== "object") continue;
              const name = (item.name || "").toLowerCase();
              const desc = (item.description || "").toLowerCase();
              const queryLower = query.toLowerCase().trim();
              if (
                queryLower.length >= 2 &&
                !(name.includes(queryLower) || desc.includes(queryLower))
              ) {
                continue;
              }
              const actualType = item.type || itemType;
              if (type && actualType !== type) continue;

              allItems.push({
                centerId,
                centerName: center.centerName || "Unknown",
                centerType: center.centerType || "medical_center",
                lat: location.lat,
                lng: location.lng,
                address: center.address || "",
                phone: center.phone || "",
                email: center.email || "",
                operatingHours: center.operatingHours || null,
                itemId,
                name: item.name,
                description: item.description || "",
                displayPrice: item.price || item.sellingPrice || 0,
                itemType: actualType,
                unit: item.unit || (item.unitPrice ? "unit" : ""),
                prescriptionRequired: item.prescriptionRequired || false,
              });
            }
          }
        }
      }
    }

    // ─── Deduplicate ──────────────────────────────────────────────
    const uniqueMap = new Map();
    for (const item of allItems) {
      const key = `${item.centerId}|${item.itemId}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    }
    allItems = Array.from(uniqueMap.values());

    // ─── Group by center & filter by distance ────────────────────
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
          ratings: null,
        };
      }

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

    const results = Object.values(grouped);
    results.sort((a: any, b: any) => a.distance - b.distance);

    cache.set(cacheKey, results, 30);

    logger.info(
      {
        query,
        type,
        resultCount: results.length,
        matchedItems: allItems.length,
        usedIndex: indexUsed,
      },
      "Search completed",
    );

    return NextResponse.json({
      success: true,
      data: results.slice(0, 50),
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
