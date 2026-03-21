// import { NextRequest, NextResponse } from "next/server";
// import { adminDb } from "@/app/utils/firebaseAdmin";

// export async function GET(request: NextRequest) {
//   const { searchParams } = new URL(request.url);
//   const search = searchParams.get("search")?.toLowerCase();
//   const specialty = searchParams.get("specialty");
//   const lat = searchParams.get("lat");
//   const lng = searchParams.get("lng");
//   const radius = searchParams.get("radius") || "10"; // km, optional

//   try {
//     const medicsRef = adminDb.ref("doza/medics");
//     const snapshot = await medicsRef.once("value");
//     let medics = snapshot.val() || [];

//     // Filter by search term (name or specialty)
//     if (search) {
//       medics = medics.filter(
//         (m: any) =>
//           m.name.toLowerCase().includes(search) ||
//           m.specialty.toLowerCase().includes(search),
//       );
//     }
//     if (specialty) {
//       medics = medics.filter((m: any) => m.specialty === specialty);
//     }
//     // Location filtering could be added here if coordinates exist

//     return NextResponse.json({ success: true, data: medics });
//   } catch (error) {
//     console.error("GET medics error:", error);
//     return NextResponse.json(
//       { success: false, error: "Internal server error" },
//       { status: 500 },
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();
const professionalsRef = db.ref("healthcareProfessionals");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "";
    const searchQuery = searchParams.get("search")?.toLowerCase() || "";

    const snapshot = await professionalsRef.once("value");
    const data = snapshot.val();

    if (!data) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Transform Firebase object into array of medics
    const medics = Object.entries(data).map(([id, record]: [string, any]) => {
      const personal = record.personalInfo || {};
      const professional = record.professionalInfo || {};
      const location = record.location || {};
      const practice = record.practiceInfo || {};

      // Construct full name
      const firstName = personal.firstName || "";
      const lastName = personal.lastName || "";
      const name = `${firstName} ${lastName}`.trim() || "Unknown";

      // Construct specialty string from role + specialties
      const role = professional.role || "other";
      const specialties = professional.specialties || [];
      const specialty =
        specialties.length > 0 ? `${role} - ${specialties[0]}` : role;

      // Address
      const address = location.address || "Address not provided";

      // Phone & email
      const phone = personal.phone || null;
      const email = personal.email || null;

      // Education (qualifications)
      const education = professional.qualifications || [];

      // Experience (years)
      const experience = professional.yearsOfExperience || null;

      // Bio
      const bio = professional.bio || "";

      // Price (hourlyRate)
      const price = practice.hourlyRate || null;

      // Profile image (base64 or URL)
      const profileImage = personal.profilePhoto || null;

      // Rating & reviews – not present in your data, so we'll omit or set defaults
      const rating = null;
      const reviews = null;

      return {
        id,
        name,
        specialty,
        rating,
        reviews,
        address,
        phone,
        email,
        education,
        experience,
        bio,
        price,
        profileImage,
        role, // keep role for filtering
      };
    });

    // Filter by category if provided
    let filtered = medics;
    if (category) {
      filtered = medics.filter(
        (m) => m.role.toLowerCase() === category.toLowerCase(),
      );
    }

    // Filter by search query (name or specialty)
    if (searchQuery) {
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery) ||
          m.specialty.toLowerCase().includes(searchQuery),
      );
    }

    return NextResponse.json({ success: true, data: filtered });
  } catch (error) {
    console.error("Error fetching medics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch medics" },
      { status: 500 },
    );
  }
}
