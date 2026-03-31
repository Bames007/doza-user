import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/utils/firebaseAdmin";

// ----------------------------------------------------------------------
// Haversine distance (km)
// ----------------------------------------------------------------------
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

// ----------------------------------------------------------------------
// Main search endpoint
// ----------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim().toLowerCase() || "";
  const type = searchParams.get("type") || "service"; // service | drug | test
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");
  const radius = parseInt(searchParams.get("radius") || "50");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { success: false, error: "Invalid location" },
      { status: 400 },
    );
  }

  try {
    // Fetch all centers once
    const centersRef = adminDb.ref("doza_centers");
    const snapshot = await centersRef.get();
    const allCenters = snapshot.val() || {};

    const results: any[] = [];

    // Iterate through each registered center
    for (const [centerId, center] of Object.entries(allCenters) as any) {
      // Skip malformed entries (must have location and name)
      const centerLat = center.location?.lat;
      const centerLng = center.location?.lng;
      if (!centerLat || !centerLng || !center.centerName) continue;

      // Filter by distance
      const distance = getDistance(lat, lng, centerLat, centerLng);
      if (distance > radius) continue;

      let matches: any[] = [];

      // ------------------------------------------------------------------
      // 1. Services (any center can have services)
      // ------------------------------------------------------------------
      if (type === "service" && center.services) {
        for (const [serviceId, service] of Object.entries(
          center.services,
        ) as any) {
          const name = (service.name || "").toLowerCase();
          const desc = (service.description || "").toLowerCase();
          const category = (service.category || "").toLowerCase();
          if (
            name.includes(query) ||
            desc.includes(query) ||
            category.includes(query)
          ) {
            matches.push({
              id: serviceId,
              name: service.name,
              price: service.price,
              description: service.description,
              type: "service",
            });
          }
        }
      }

      // ------------------------------------------------------------------
      // 2. Drugs (products)
      // ------------------------------------------------------------------
      if (type === "drug" && center.products) {
        for (const [productId, product] of Object.entries(
          center.products,
        ) as any) {
          const name = (product.name || "").toLowerCase();
          const generic = (product.genericName || "").toLowerCase();
          const category = (product.category || "").toLowerCase();
          const brand = (product.brand || "").toLowerCase();
          if (
            name.includes(query) ||
            generic.includes(query) ||
            category.includes(query) ||
            brand.includes(query)
          ) {
            matches.push({
              id: productId,
              name: product.name,
              price: product.sellingPrice || product.unitPrice,
              description: product.description,
              type: "drug",
              unit: product.unit,
              prescriptionRequired: product.prescriptionRequired,
            });
          }
        }
      }

      // ------------------------------------------------------------------
      // 3. Lab Tests
      // ------------------------------------------------------------------
      if (type === "test") {
        const labTests = center.lab_tests || center.labTests;
        if (labTests) {
          for (const [testId, test] of Object.entries(labTests) as any) {
            const testName = (test.testType || test.name || "").toLowerCase();
            const description = (test.description || "").toLowerCase();
            if (testName.includes(query) || description.includes(query)) {
              matches.push({
                id: testId,
                name: test.testType || test.name,
                price: test.price,
                description: test.description,
                type: "test",
              });
            }
          }
        }
      }

      // If this center has matches, add it to the results
      if (matches.length > 0) {
        results.push({
          centerId,
          centerName: center.centerName,
          centerType: center.centerType,
          location: { lat: centerLat, lng: centerLng },
          address: center.location?.address,
          phone: center.contact?.phone,
          email: center.contact?.email,
          operatingHours: center.operatingHours,
          distance: Math.round(distance * 10) / 10,
          matches: matches.slice(0, 5), // limit to 5 per center
        });
      }
    }

    // Sort by distance (nearest first)
    results.sort((a, b) => a.distance - b.distance);

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}
