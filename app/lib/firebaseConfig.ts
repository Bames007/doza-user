import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
// import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL, // This is crucial
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, // This is also crucial
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Database and Storage
const db = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth(app);
// const analytics = getAnalytics(app);

// Initialize Analytics only in client-side
// let analytics = null;
// if (typeof window !== "undefined") {
//   isSupported().then((yes) => (yes ? getAnalytics(app) : null));
// }

export { app, db, storage };
