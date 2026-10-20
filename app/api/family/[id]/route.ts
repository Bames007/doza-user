import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const updateContactSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  relationship: z.string().min(1).optional(),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: "Contact ID required" },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const parseResult = updateContactSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn({
        uid,
        contactId: id,
        message: "Invalid contact update",
        validationErrors: parseResult.error.flatten(),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid update data",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const contactRef = adminDb.ref(`doza/users/${uid}/familyFriends/${id}`);
    const snap = await contactRef.get();
    if (!snap.exists()) {
      return NextResponse.json(
        { success: false, error: "Contact not found" },
        { status: 404 },
      );
    }

    const updates = { ...parseResult.data, updatedAt: Date.now() };
    await contactRef.update(updates); // ✅ surgical update

    const updated = { id, ...snap.val(), ...updates };
    logger.info({ uid, contactId: id, message: "Family contact updated" });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error({
      uid,
      contactId: id,
      message: "PUT family contact failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Unable to update contact" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: "Contact ID required" },
      { status: 400 },
    );
  }

  try {
    const contactRef = adminDb.ref(`doza/users/${uid}/familyFriends/${id}`);
    const snap = await contactRef.get();
    if (!snap.exists()) {
      return NextResponse.json(
        { success: false, error: "Contact not found" },
        { status: 404 },
      );
    }

    await contactRef.remove(); // ✅ deletes only this child
    logger.info({ uid, contactId: id, message: "Family contact deleted" });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({
      uid,
      contactId: id,
      message: "DELETE family contact failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Unable to delete contact" },
      { status: 500 },
    );
  }
}
