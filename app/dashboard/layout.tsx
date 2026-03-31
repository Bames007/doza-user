import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/app/utils/firebaseAdmin";
import DashboardClientWrapper from "./DashboardClientWrapper";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;

  if (!sessionCookie) {
    redirect("/");
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    uid = decoded.uid;
  } catch (error) {
    console.error("Invalid session cookie", error);
    redirect("/");
  }

  const userRef = adminDb.ref(`doza/users/${uid}`);
  const userSnapshot = await userRef.get();
  if (!userSnapshot.exists()) {
    redirect("/");
  }
  const userData = userSnapshot.val();

  const user = {
    id: uid,
    email: userData.personalProfile?.email || "",
    fullName:
      `${userData.personalProfile?.fname || ""} ${userData.personalProfile?.lname || ""}`.trim(),
    avatar: userData.personalProfile?.selectedImage || "",
    subscription: userData.subscription?.plan,
    profile: userData.personalProfile || {},
  };

  return (
    <DashboardClientWrapper user={user}>{children}</DashboardClientWrapper>
  );
}
