// User App: /api/user/doza-requests/route.ts

import { NextRequest, NextResponse } from "next/server";
import { ref, get } from "firebase/database";
import { db } from "@/app/utils/firebaseConfig";
import { unauthorized, handleError } from "@/app/lib/apiHelpers";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return unauthorized();

  try {
    const userRequestsRef = ref(db, `doza_users/${userId}/requests`);
    const snapshot = await get(userRequestsRef);
    const requests = snapshot.exists() ? snapshot.val() : {};

    const list = Object.entries(requests).map(([id, data]) => ({
      id,
      ...(data as object),
    }));

    // CHANGE: Deduplicate by id to prevent React key warnings
    const uniqueMap = new Map<string, any>();
    for (const item of list) {
      uniqueMap.set(item.id, item); // later entries overwrite earlier ones
    }
    const uniqueList = Array.from(uniqueMap.values());

    // Sort newest first
    uniqueList.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return NextResponse.json({ success: true, data: uniqueList });
  } catch (error) {
    return handleError(error);
  }
}
