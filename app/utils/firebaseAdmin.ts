import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getAuth } from "firebase-admin/auth"; // <-- add this

const apps = getApps();

if (!apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

    console.log("🔍 Checking Firebase Admin env vars:");
    console.log("  FIREBASE_PROJECT_ID:", projectId ? "✅" : "❌");
    console.log("  FIREBASE_CLIENT_EMAIL:", clientEmail ? "✅" : "❌");
    console.log("  FIREBASE_PRIVATE_KEY:", privateKey ? "✅" : "❌");
    console.log(
      "  NEXT_PUBLIC_FIREBASE_DATABASE_URL:",
      databaseURL ? "✅" : "❌",
    );

    if (!projectId || !clientEmail || !privateKey || !databaseURL) {
      throw new Error("Missing required Firebase Admin environment variables.");
    }

    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      databaseURL,
    });
    console.log("✅ Firebase Admin initialized");
  } catch (error) {
    console.error("❌ Firebase Admin init error:", error);
    throw error;
  }
}

export const adminDb = getDatabase();
export const adminAuth = getAuth();
