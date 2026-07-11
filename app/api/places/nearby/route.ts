import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import logger from "@/app/utils/logger";

const placesQuerySchema = z.object({
  lat: z.string().refine((v) => !isNaN(parseFloat(v)), "Invalid latitude"),
  lng: z.string().refine((v) => !isNaN(parseFloat(v)), "Invalid longitude"),
  radius: z.string().optional().default("5000"),
  type: z.string().optional().default("hospital|pharmacy|clinic"),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const parsed = placesQuerySchema.safeParse({
    lat: searchParams.get("lat"),
    lng: searchParams.get("lng"),
    radius: searchParams.get("radius"),
    type: searchParams.get("type"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid or missing location parameters" },
      { status: 400 },
    );
  }

  const { lat, lng, radius, type } = parsed.data;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    logger.error({ message: "Google Maps API key missing" });
    return NextResponse.json(
      { success: false, error: "Service unavailable" },
      { status: 500 },
    );
  }

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      logger.warn({
        message: "Places API returned error",
        status: data.status,
        errorMessage: data.error_message,
      });
      return NextResponse.json(
        { success: false, error: "Unable to fetch places" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: data.results });
  } catch (error) {
    logger.error({ message: "Places proxy request failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to load nearby places" },
      { status: 500 },
    );
  }
}
