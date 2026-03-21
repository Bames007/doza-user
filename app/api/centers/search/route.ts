import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/utils/firebaseAdmin";

// Simple in‑memory cache with TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase().trim() || "";
    const type = searchParams.get("type") || "service";
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const maxDistance = parseFloat(searchParams.get("maxDistance") || "50");

    const hasValidLocation =
      lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng);

    // 1. Check cache for centers data
    let centers = cache.get("centers");
    if (!centers) {
      console.log("Fetching centers from Firebase...");
      const centersRef = adminDb.ref("doza_centers");
      const snapshot = await centersRef.get();
      centers = snapshot.val() || {};
      cache.set("centers", centers);
      setTimeout(() => cache.delete("centers"), CACHE_TTL);
    } else {
      console.log("Using cached centers");
    }

    const results: any[] = [];

    // 2. Iterate over centers (same as before)
    Object.entries(centers).forEach(([centerId, center]: [string, any]) => {
      if (!center.location) return;

      const centerLat = center.location.lat;
      const centerLng = center.location.lng;

      let distance = null;
      if (
        hasValidLocation &&
        centerLat &&
        centerLng &&
        centerLat !== 0 &&
        centerLng !== 0
      ) {
        distance = haversineDistance(lat, lng, centerLat, centerLng);
        if (distance > maxDistance) return;
      }

      const matches: any[] = [];

      // Search drugs
      if (type === "drug" && center.products) {
        Object.entries(center.products).forEach(
          ([productId, product]: [string, any]) => {
            const name = (product.name || "").toLowerCase();
            const generic = (product.genericName || "").toLowerCase();
            if (name.includes(query) || generic.includes(query)) {
              matches.push({
                type: "drug",
                id: productId,
                name: product.name,
                price: product.sellingPrice,
                unit: product.unit,
                inStock: (product.quantity || 0) > 0,
              });
            }
          },
        );
      }

      // Search services
      if (type === "service" && center.services) {
        Object.entries(center.services).forEach(
          ([serviceId, service]: [string, any]) => {
            const name = (service.name || "").toLowerCase();
            const desc = (service.description || "").toLowerCase();
            if (name.includes(query) || desc.includes(query)) {
              matches.push({
                type: "service",
                id: serviceId,
                name: service.name,
                price: service.price,
                duration: service.duration,
              });
            }
          },
        );
      }

      // Search lab tests
      if (type === "test" && center.lab_tests) {
        Object.entries(center.lab_tests).forEach(
          ([testId, test]: [string, any]) => {
            const testName = (test.testType || "").toLowerCase();
            if (testName.includes(query)) {
              matches.push({
                type: "test",
                id: testId,
                name: test.testType,
                price: test.price,
              });
            }
          },
        );
      }

      if (matches.length === 0) return;

      results.push({
        centerId,
        centerName: center.centerName,
        centerType: center.centerType,
        address: center.location.address,
        phone: center.contact?.phone,
        email: center.contact?.email,
        website: center.contact?.website,
        logo: center.logo,
        operatingHours: center.operatingHours,
        distance: distance ? Math.round(distance * 10) / 10 : null,
        location: { lat: centerLat, lng: centerLng },
        matches,
      });
    });

    // 3. Sort results
    results.sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}
