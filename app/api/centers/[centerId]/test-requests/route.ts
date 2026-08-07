import { NextRequest, NextResponse } from "next/server";
import { ref, push, set } from "firebase/database";
import { db } from "@/app/utils/firebaseConfig";
import { z } from "zod";
import { handleError, unauthorized } from "@/app/lib/apiHelpers";

const schema = z.object({
  dozaUserId: z.string(),
  patientName: z.string(),
  patientPhone: z.string().optional(),
  testName: z.string(),
  notes: z.string().optional(),
  status: z
    .enum(["pending", "approved", "rejected", "completed"])
    .default("pending"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: centerId } = await params;
  const userId = req.headers.get("x-user-id");
  if (!userId) return unauthorized();

  try {
    const body = await req.json();
    const validated = schema.parse(body);
    const refPath = ref(db, `doza_centers/${centerId}/testRequests`);
    const newRef = push(refPath);
    await set(newRef, {
      ...validated,
      centerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ success: true, data: { id: newRef.key } });
  } catch (err) {
    return handleError(err);
  }
}
