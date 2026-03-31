// //api/centers/[centerId]/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { adminDb } from "@/app/utils/firebaseAdmin";

// export async function GET(
//   req: NextRequest,
//   { params }: { params: { centerId: string } },
// ) {
//   try {
//     const centerId = params.centerId;
//     const centerRef = adminDb.ref(`doza_centers/${centerId}`);
//     const snapshot = await centerRef.get();
//     if (!snapshot.exists()) {
//       return NextResponse.json(
//         { success: false, error: "Center not found" },
//         { status: 404 },
//       );
//     }
//     return NextResponse.json({ success: true, data: snapshot.val() });
//   } catch (error) {
//     console.error("Error fetching center:", error);
//     return NextResponse.json(
//       { success: false, error: "Server error" },
//       { status: 500 },
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/utils/firebaseAdmin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ centerId: string }> },
) {
  try {
    const { centerId } = await params;
    const centerRef = adminDb.ref(`doza_centers/${centerId}`);
    const snapshot = await centerRef.get();
    if (!snapshot.exists()) {
      return NextResponse.json(
        { success: false, error: "Center not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: snapshot.val() });
  } catch (error) {
    console.error("Error fetching center:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}
