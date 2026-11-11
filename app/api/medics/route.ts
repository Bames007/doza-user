// app/api/medics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/utils/firebaseAdmin";
import logger from "@/app/utils/logger";

let cachedList: any[] | null = null;
let cacheTimestamp = 0;
const LIST_CACHE_TTL_MS = 60_000;

const MEDICS_NODE = "doza_medics";

async function getMedicsList(): Promise<any[]> {
  if (cachedList && Date.now() - cacheTimestamp < LIST_CACHE_TTL_MS) {
    return cachedList;
  }

  const snapshot = await adminDb.ref(MEDICS_NODE).once("value");
  const data = snapshot.val();

  if (!data) {
    cachedList = [];
    cacheTimestamp = Date.now();
    return [];
  }

  const medics = Object.entries(data)
    .filter(([, record]: [string, any]) => {
      const role = record?.professionalInfo?.role;
      if (typeof role !== "string" || !role.trim()) return false;
      const firstName = record?.personalInfo?.firstName;
      if (typeof firstName !== "string" || !firstName.trim()) return false;
      return true;
    })
    .map(([id, record]: [string, any]) => {
      const availability = record.practiceInfo?.availability || {};
      const pricing = record.practiceInfo?.pricing || {};
      const services = Array.isArray(record.practiceInfo?.services)
        ? record.practiceInfo.services.filter((s: any) => s?.active !== false)
        : [];

      return {
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
        emergency: availability.emergencyAvailable === true,
        availability,
        city: record.location?.city || "Remote",
        address: record.location?.address || "Address not provided",
        profileImage: record.personalInfo?.profilePhoto || null,
        phone: record.personalInfo?.phone || null,

        // ── Live status + instant/emergency config ────────
        status: record.status || "offline",
        instantTalk: availability.instantTalk === true,
        instantTalkWindowMinutes:
          Number(availability.instantTalkWindowMinutes) || 15,
        instantTalkPremium: Number(availability.instantTalkPremium) || 0,
        emergencyAvailable: availability.emergencyAvailable === true,
        emergencyPremium: Number(availability.emergencyPremium) || 0,
        urgentFee: Number(pricing.urgentFee) || 0,
        services,
      };
    });

  cachedList = medics;
  cacheTimestamp = Date.now();
  return medics;
}

async function attachRatings(medics: any[]): Promise<any[]> {
  return Promise.all(
    medics.map(async (m) => {
      try {
        const snap = await adminDb
          .ref(`${MEDICS_NODE}/${m.id}/ratingSummary`)
          .once("value");
        const s = snap.val() || { average: 0, count: 0 };
        return {
          ...m,
          ratingAverage: Number(s.average) || 0,
          ratingCount: Number(s.count) || 0,
        };
      } catch {
        return { ...m, ratingAverage: 0, ratingCount: 0 };
      }
    }),
  );
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

    const withRatings = await attachRatings(filtered);

    return NextResponse.json({ success: true, data: withRatings });
  } catch (error) {
    logger.error({ message: "GET medics list failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to load medics" },
      { status: 500 },
    );
  }
}
