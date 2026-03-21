"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { poppins } from "@/app/constants";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("userSession");
    localStorage.removeItem("loginTime");
    router.push("/");
  };

  return (
    <button
      onClick={handleLogout}
      className={`flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors ${poppins.className}`}
    >
      <LogOut className="w-4 h-4" />
      Logout
    </button>
  );
}
