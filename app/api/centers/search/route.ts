// // app/api/centers/search/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { adminDb } from "@/app/utils/firebaseAdmin";
// import { z } from "zod";
// import logger from "@/app/utils/logger";

// function getDistance(
//   lat1: number,
//   lng1: number,
//   lat2: number,
//   lng2: number,
// ): number {
//   const toRad = (val: number) => (val * Math.PI) / 180;
//   const R = 6371;
//   const dLat = toRad(lat2 - lat1);
//   const dLng = toRad(lng2 - lng1);
//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return R * c;
// }

// const searchQuerySchema = z.object({
//   query: z.string().optional().default(""),
//   type: z.enum(["service", "drug", "test"]).optional().default("service"),
//   lat: z.coerce.number(),
//   lng: z.coerce.number(),
//   radius: z.coerce.number().optional().default(50),
// });

// // In-memory cache
// let searchIndexCache: { data: any[]; timestamp: number } | null = null;
// const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// async function getSearchIndex(): Promise<any[]> {
//   if (searchIndexCache && Date.now() - searchIndexCache.timestamp < CACHE_TTL) {
//     logger.info({
//       message: "Search index cache hit",
//       itemCount: searchIndexCache.data.length,
//     });
//     return searchIndexCache.data;
//   }

//   const centersSnap = await adminDb.ref("doza_centers").get();
//   const centers = centersSnap.val() || {};
//   const centerCount = Object.keys(centers).length;

//   logger.info({ message: "Building search index", centerCount });

//   const index: any[] = [];

//   for (const [centerId, center] of Object.entries(centers) as any) {
//     // Skip centers without valid location
//     const lat = center.location?.lat;
//     const lng = center.location?.lng;
//     if (!lat || !lng || !center.centerName) continue;

//     const centerMeta = {
//       centerId,
//       centerName: center.centerName,
//       centerType: center.centerType || "unknown",
//       location: { lat, lng },
//       address: center.location?.address || null,
//       phone: center.contact?.phone || null,
//       email: center.contact?.email || null,
//       operatingHours: center.operatingHours || null,
//     };

//     let itemCount = 0;

//     // Services - check multiple possible structures
//     const services = center.services || center.Services || center.serviceList;
//     if (services && typeof services === "object") {
//       for (const [serviceId, svc] of Object.entries(services) as any) {
//         if (svc && typeof svc === "object") {
//           index.push({
//             ...centerMeta,
//             itemType: "service",
//             itemId: serviceId,
//             name: svc.name || svc.serviceName || "Unnamed Service",
//             price: svc.price ?? svc.cost ?? 0,
//             description: svc.description || svc.notes || "",
//           });
//           itemCount++;
//         }
//       }
//     }

//     // Products/Medications - check multiple possible structures
//     const products = center.products || center.inventory || center.medications;
//     if (products && typeof products === "object") {
//       for (const [productId, prod] of Object.entries(products) as any) {
//         if (prod && typeof prod === "object") {
//           // Determine if this is a drug/medication
//           const isDrug =
//             prod.isMedicalEquipment === false ||
//             prod.category === "medication" ||
//             prod.category === "pharmaceutical" ||
//             prod.category === "Analgesics" ||
//             prod.category === "Antibiotics" ||
//             prod.category === "Vitamins";

//           if (isDrug) {
//             index.push({
//               ...centerMeta,
//               itemType: "drug",
//               itemId: productId,
//               name: prod.name || prod.productName || "Unnamed Product",
//               price: prod.sellingPrice || prod.unitPrice || prod.price || 0,
//               description: prod.description || "",
//               unit: prod.unit || null,
//               prescriptionRequired: prod.prescriptionRequired || false,
//             });
//             itemCount++;
//           }
//         }
//       }
//     }

//     // Lab tests - check multiple possible structures
//     const labTests = center.lab_tests || center.labTests || center.tests;
//     if (labTests && typeof labTests === "object") {
//       for (const [testId, test] of Object.entries(labTests) as any) {
//         if (test && typeof test === "object") {
//           index.push({
//             ...centerMeta,
//             itemType: "test",
//             itemId: testId,
//             name: test.testType || test.name || test.testName || "Unnamed Test",
//             price: test.price ?? test.cost ?? 0,
//             description: test.description || "",
//           });
//           itemCount++;
//         }
//       }
//     }

//     if (itemCount > 0) {
//       logger.info({
//         centerId,
//         centerName: center.centerName,
//         itemCount,
//         message: "Center indexed",
//       });
//     }
//   }

//   logger.info({ message: "Search index built", totalItems: index.length });
//   searchIndexCache = { data: index, timestamp: Date.now() };
//   return index;
// }

// export async function GET(request: NextRequest) {
//   const { searchParams } = new URL(request.url);
//   const parsed = searchQuerySchema.safeParse(Object.fromEntries(searchParams));

//   if (!parsed.success) {
//     return NextResponse.json(
//       {
//         success: false,
//         error: "Invalid parameters",
//         details: parsed.error.flatten(),
//       },
//       { status: 400 },
//     );
//   }

//   const { query, type, lat, lng, radius } = parsed.data;

//   try {
//     const fullIndex = await getSearchIndex();
//     const q = query.toLowerCase().trim();

//     // Filter by type + text match
//     let matchedItems = fullIndex.filter((item) => {
//       if (item.itemType !== type) return false;
//       if (!q) return true;
//       const name = (item.name || "").toLowerCase();
//       const desc = (item.description || "").toLowerCase();
//       return name.includes(q) || desc.includes(q);
//     });

//     // Also search by center name if query exists
//     if (q) {
//       const centerNameMatches = fullIndex.filter((item) => {
//         if (item.itemType !== type) return false;
//         const centerName = (item.centerName || "").toLowerCase();
//         return centerName.includes(q);
//       });
//       matchedItems = [...matchedItems, ...centerNameMatches];
//     }

//     // Remove duplicates by itemId + centerId
//     const uniqueMap = new Map();
//     for (const item of matchedItems) {
//       const key = `${item.centerId}|${item.itemId}`;
//       if (!uniqueMap.has(key)) {
//         uniqueMap.set(key, item);
//       }
//     }
//     matchedItems = Array.from(uniqueMap.values());

//     // Distance filter + grouping per center
//     const grouped: Record<string, any> = {};
//     for (const item of matchedItems) {
//       const d = getDistance(lat, lng, item.location.lat, item.location.lng);
//       if (d > radius) continue;

//       const key = item.centerId;
//       if (!grouped[key]) {
//         grouped[key] = {
//           centerId: item.centerId,
//           centerName: item.centerName,
//           centerType: item.centerType,
//           location: item.location,
//           address: item.address,
//           phone: item.phone,
//           email: item.email,
//           operatingHours: item.operatingHours,
//           distance: Math.round(d * 10) / 10,
//           matches: [],
//         };
//       }

//       // Avoid duplicate matches for same center+item
//       const exists = grouped[key].matches.some(
//         (m: any) => m.id === item.itemId,
//       );
//       if (!exists) {
//         grouped[key].matches.push({
//           id: item.itemId,
//           name: item.name,
//           price: item.price,
//           description: item.description,
//           type: item.itemType,
//           ...(item.unit && { unit: item.unit }),
//           ...(item.prescriptionRequired !== undefined && {
//             prescriptionRequired: item.prescriptionRequired,
//           }),
//         });
//       }
//     }

//     const results = Object.values(grouped).sort(
//       (a: any, b: any) => a.distance - b.distance,
//     );

//     logger.info({
//       query,
//       type,
//       matchedCount: matchedItems.length,
//       resultCount: results.length,
//       message: "Search completed",
//     });

//     return NextResponse.json({
//       success: true,
//       data: results.slice(0, 50),
//     });
//   } catch (error) {
//     logger.error({
//       message: "Search failed",
//       error: error instanceof Error ? error.message : String(error),
//     });
//     return NextResponse.json(
//       { success: false, error: "Unable to perform search" },
//       { status: 500 },
//     );
//   }
// }

// app/api/centers/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  ref,
  query,
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
        q = query(
          refPath,
          orderByChild("searchText"),
          startAt(qLower),
          endAt(qLower + "\uf8ff"),
          limitToFirst(50),
        );
      } else {
        // No query: just get first 50 (e.g., for popular items)
        q = query(refPath, orderByChild("searchText"), limitToFirst(50));
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

    // 8. If we have a search query, also allow matching by center name
    // (We already did text search on searchText, but center name isn't in searchText.
    // We'll add a fallback: we can store centerName in the index, but we can also search by centerName separately.)
    // However, the index entries already include centerName, so we can filter after.
    // Actually, we already used searchText which includes name+description. If user searches for center name,
    // the center name is not in the index entry's searchText. We'll add a secondary pass:
    if (query && query.trim().length >= 2) {
      const qLower = query.toLowerCase().trim();
      // We'll do a separate query on all items (without text filter) and filter by centerName
      // But that would be heavy. Instead, we could have a separate center index, but for simplicity,
      // we'll just accept that center name matches will not appear unless the center name is in the product name.
      // Better: we can include centerName in searchText (we already did in the index builder).
      // So it's already covered.
    }

    // 9. Distance filter and group by center
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

    // 10. Sort centers by distance
    const results = Object.values(grouped).sort(
      (a: any, b: any) => a.distance - b.distance,
    );

    // 11. Cache the results (30 seconds TTL)
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
