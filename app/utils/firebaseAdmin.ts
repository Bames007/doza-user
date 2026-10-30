// app/utils/firebaseAdmin.ts
import {
  initializeApp,
  getApps,
  cert,
  getApp,
  type App,
} from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getAuth } from "firebase-admin/auth";

function getOrInitializeApp(): App {
  // Survives Turbopack/webpack duplicate module instances
  const g = globalThis as unknown as { __FIREBASE_ADMIN_APP__?: App };
  if (g.__FIREBASE_ADMIN_APP__) return g.__FIREBASE_ADMIN_APP__;

  if (getApps().length > 0) {
    const existing = getApp();
    g.__FIREBASE_ADMIN_APP__ = existing;
    return existing;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

  if (!projectId || !clientEmail || !privateKey || !databaseURL) {
    throw new Error("Missing required Firebase Admin environment variables.");
  }

  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    databaseURL,
  });

  g.__FIREBASE_ADMIN_APP__ = app;
  return app;
}

const app = getOrInitializeApp();
export const adminDb = getDatabase(app);
export const adminAuth = getAuth(app);
