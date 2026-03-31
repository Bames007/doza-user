// //app/api/medics/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import admin from "firebase-admin";

// // Initialize Firebase Admin SDK if not already initialized
// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert({
//       projectId: process.env.FIREBASE_PROJECT_ID,
//       clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//       privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
//     }),
//     databaseURL: process.env.FIREBASE_DATABASE_URL,
//   });
// }

// const db = admin.database();
// const professionalsRef = db.ref("healthcareProfessionals");

// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const category = searchParams.get("category") || "";
//     const searchQuery = searchParams.get("search")?.toLowerCase() || "";

//     const snapshot = await professionalsRef.once("value");
//     const data = snapshot.val();

//     if (!data) {
//       return NextResponse.json({ success: true, data: [] });
//     }

//     // Transform Firebase object into array of medics
//     const medics = Object.entries(data).map(([id, record]: [string, any]) => {
//       const personal = record.personalInfo || {};
//       const professional = record.professionalInfo || {};
//       const location = record.location || {};
//       const practice = record.practiceInfo || {};

//       // Construct full name
//       const firstName = personal.firstName || "";
//       const lastName = personal.lastName || "";
//       const name = `${firstName} ${lastName}`.trim() || "Unknown";

//       // Construct specialty string from role + specialties
//       const role = professional.role || "other";
//       const specialties = professional.specialties || [];
//       const specialty =
//         specialties.length > 0 ? `${role} - ${specialties[0]}` : role;

//       // Address
//       const address = location.address || "Address not provided";

//       // Phone & email
//       const phone = personal.phone || null;
//       const email = personal.email || null;

//       // Education (qualifications)
//       const education = professional.qualifications || [];

//       // Experience (years)
//       const experience = professional.yearsOfExperience || null;

//       // Bio
//       const bio = professional.bio || "";

//       // Price (hourlyRate)
//       const price = practice.hourlyRate || null;

//       // Profile image (base64 or URL)
//       const profileImage = personal.profilePhoto || null;

//       // Rating & reviews – not present in your data, so we'll omit or set defaults
//       const rating = null;
//       const reviews = null;

//       return {
//         id,
//         name,
//         specialty,
//         rating,
//         reviews,
//         address,
//         phone,
//         email,
//         education,
//         experience,
//         bio,
//         price,
//         profileImage,
//         role, // keep role for filtering
//       };
//     });

//     // Filter by category if provided
//     let filtered = medics;
//     if (category) {
//       filtered = medics.filter(
//         (m) => m.role.toLowerCase() === category.toLowerCase(),
//       );
//     }

//     // Filter by search query (name or specialty)
//     if (searchQuery) {
//       filtered = filtered.filter(
//         (m) =>
//           m.name.toLowerCase().includes(searchQuery) ||
//           m.specialty.toLowerCase().includes(searchQuery),
//       );
//     }

//     return NextResponse.json({ success: true, data: filtered });
//   } catch (error) {
//     console.error("Error fetching medics:", error);
//     return NextResponse.json(
//       { success: false, error: "Failed to fetch medics" },
//       { status: 500 },
//     );
//   }
// }
import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "";

    // Path matches your Firebase structure
    const snapshot = await db.ref("healthcareProfessionals").once("value");
    const data = snapshot.val();

    if (!data) return NextResponse.json({ success: true, data: [] });

    const medics = Object.entries(data).map(([id, record]: [string, any]) => ({
      id,
      name: `${record.personalInfo?.firstName} ${record.personalInfo?.lastName}`,
      role: record.professionalInfo?.role || "other",
      specialty:
        record.professionalInfo?.specialties?.[0] ||
        record.professionalInfo?.role,
      allSpecialties: record.professionalInfo?.specialties || [],
      experience: record.professionalInfo?.yearsOfExperience,
      education: record.professionalInfo?.qualifications || [],
      bio: record.professionalInfo?.bio,
      price: record.practiceInfo?.hourlyRate,
      languages: record.practiceInfo?.languages || ["English"],
      emergency: record.practiceInfo?.availability?.emergencyAvailable || false,
      availability: record.practiceInfo?.availability || {},
      city: record.location?.city || "Remote",
      address: record.location?.address,
      profileImage: record.personalInfo?.profilePhoto,
      phone: record.personalInfo?.phone,
    }));

    let filtered = medics;
    if (category && category !== "all") {
      filtered = medics.filter(
        (m) => m.role.toLowerCase() === category.toLowerCase(),
      );
    }

    return NextResponse.json({ success: true, data: filtered });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Fetch failed" },
      { status: 500 },
    );
  }
}
