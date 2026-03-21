import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminDb } from "@/app/utils/firebaseAdmin";
import DashboardClientWrapper from "./DashboardClientWrapper";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const sessionCookie = (await cookieStore).get("session")?.value;

  if (!sessionCookie) {
    redirect("/");
  }

  let session;
  try {
    session = JSON.parse(sessionCookie);
  } catch {
    redirect("/");
  }

  // Fetch user data (optional)
  const userRef = adminDb.ref(`doza/users/${session.user.id}`);
  const userSnapshot = await userRef.get();
  if (!userSnapshot.exists()) {
    redirect("/");
  }
  const userData = userSnapshot.val();

  const user = {
    id: session.user.id,
    email: session.user.email,
    fullName:
      session.user.fullName ||
      `${userData.personalProfile?.fname || ""} ${userData.personalProfile?.lname || ""}`.trim(),
    avatar: userData.personalProfile?.selectedImage || session.user.avatar,
    subscription: userData.subscription?.plan,
    profile: userData.personalProfile || {},
  };

  return (
    <DashboardClientWrapper user={user}>{children}</DashboardClientWrapper>
  );
}
