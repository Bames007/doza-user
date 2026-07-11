import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/utils/firebaseAdmin";
import logger from "@/app/utils/logger";

let cachedList: any[] | null = null;
let cacheTimestamp = 0;
const LIST_CACHE_TTL_MS = 60_000; // 1 minute

async function getMedicsList(): Promise<any[]> {
  if (cachedList && Date.now() - cacheTimestamp < LIST_CACHE_TTL_MS) {
    return cachedList;
  }

  const snapshot = await adminDb.ref("healthcareProfessionals").once("value");
  const data = snapshot.val();

  if (!data) {
    cachedList = [];
    cacheTimestamp = Date.now();
    return [];
  }

  const medics = Object.entries(data).map(([id, record]: [string, any]) => ({
    id,
    name:
      `${record.personalInfo?.firstName ?? ""} ${record.personalInfo?.lastName ?? ""}`.trim() ||
      "Unknown",
    role: record.professionalInfo?.role || "other",
    specialty:
      record.professionalInfo?.specialties?.[0] ||
      record.professionalInfo?.role ||
      "General",
    allSpecialties: record.professionalInfo?.specialties || [],
    experience: record.professionalInfo?.yearsOfExperience ?? null,
    education: record.professionalInfo?.qualifications || [],
    bio: record.professionalInfo?.bio || "",
    price: record.practiceInfo?.hourlyRate ?? null,
    languages: record.practiceInfo?.languages || ["English"],
    emergency: record.practiceInfo?.availability?.emergencyAvailable || false,
    availability: record.practiceInfo?.availability || {},
    city: record.location?.city || "Remote",
    address: record.location?.address || "Address not provided",
    profileImage: record.personalInfo?.profilePhoto || null,
    phone: record.personalInfo?.phone || null,
  }));

  cachedList = medics;
  cacheTimestamp = Date.now();
  return medics;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category")?.trim().toLowerCase() || "";
    const searchQuery = searchParams.get("search")?.trim().toLowerCase() || "";

    const allMedics = await getMedicsList();

    let filtered = allMedics;

    if (category && category !== "all") {
      filtered = filtered.filter((m) => m.role.toLowerCase() === category);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery) ||
          m.role.toLowerCase().includes(searchQuery) ||
          m.specialty.toLowerCase().includes(searchQuery) ||
          m.allSpecialties.some((s: string) =>
            s.toLowerCase().includes(searchQuery),
          ),
      );
    }

    return NextResponse.json({ success: true, data: filtered });
  } catch (error) {
    logger.error({ message: "GET medics list failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to load medics" },
      { status: 500 },
    );
  }
}
