"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  RefreshCw,
  Check,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { bebasNeue, poppins } from "../constants";
import Image from "next/image";

// External brand site — update path here if registration lives elsewhere
// (e.g. "https://dozamedic.com/register")
const DOZA_HOME_URL = "https://dozamedic.com";

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });

  const router = useRouter();

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "email":
        if (!value.trim()) return "Email is required";
        if (!/\S+@\S+\.\S+/.test(value)) return "Invalid email format";
        return "";
      case "password":
        if (!value) return "Password is required";
        if (value.length < 6) return "Password must be at least 6 characters";
        return "";
      default:
        return "";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    const fieldError = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: fieldError }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fieldError = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: fieldError }));
  };

  const hasErrors = () =>
    Object.values(fieldErrors).some((err) => err) ||
    !formData.email.trim() ||
    !formData.password.trim();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const newFieldErrors = {
      email: validateField("email", formData.email),
      password: validateField("password", formData.password),
    };
    setFieldErrors(newFieldErrors);

    if (Object.values(newFieldErrors).some((err) => err)) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/user-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          rememberMe,
        }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (data.data?.user) {
        localStorage.setItem(
          "userSession",
          JSON.stringify({
            user: data.data.user,
            loginTime: new Date().toISOString(),
          }),
        );
        localStorage.setItem("userId", data.data.user.id);
        localStorage.setItem(
          "userName",
          data.data.user.fullName || data.data.user.name || "",
        );
        localStorage.setItem("userRole", data.data.user.role || "");
      }

      sessionStorage.setItem("fromLogin", "true");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen bg-slate-50 selection:bg-emerald-100 ${poppins.className}`}
    >
      {/* Background blurs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-100/40 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-[120px]" />
      </div>

      {/* Outer — items-start on mobile prevents clipped content when the card is taller than the viewport */}
      <div className="relative min-h-screen flex items-start sm:items-center justify-center p-3 sm:p-4 md:p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 bg-white/90 backdrop-blur-2xl rounded-3xl sm:rounded-[2.5rem] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.05)] border border-white overflow-hidden my-4 sm:my-0"
        >
          {/* LEFT: BRANDING (desktop only) */}
          <div className="hidden lg:flex lg:col-span-5 bg-emerald-600 p-16 flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-700" />
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[length:32px_32px]" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-16">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                  <Image
                    src="/logo.png"
                    alt="Doza Logo"
                    width={28}
                    height={28}
                  />
                </div>
                <span
                  className={`text-2xl tracking-tighter font-bold text-white ${bebasNeue.className}`}
                >
                  DOZA
                </span>
              </div>

              <h1
                className={`text-6xl font-bold text-white leading-[0.95] mb-8 ${bebasNeue.className}`}
              >
                PRECISION <br />{" "}
                <span className="text-emerald-200 text-7xl">HEALTHCARE.</span>
              </h1>
              <p className="text-emerald-50/70 text-lg leading-relaxed max-w-sm">
                Access your medical history, book appointments, and track
                wellness metrics in one secure place.
              </p>
            </div>

            <div className="relative z-10 space-y-8">
              <div className="p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10">
                <div className="flex items-center gap-4 text-white">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">HIPAA Compliant</p>
                    <p className="text-xs text-emerald-100/60">
                      Your data is encrypted end-to-end.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: FORM */}
          <div className="lg:col-span-7 p-5 sm:p-8 md:p-16 lg:p-20 flex flex-col justify-center bg-white/50">
            <div className="max-w-md mx-auto w-full">
              {/* Mobile branding — smaller on mobile */}
              <div className="lg:hidden flex items-center justify-between mb-6 sm:mb-10">
                <div className="flex items-center gap-2">
                  <Image
                    src="/logo.png"
                    alt="Doza Logo"
                    width={28}
                    height={28}
                  />
                  <span
                    className={`text-xl sm:text-2xl font-bold text-slate-900 ${bebasNeue.className}`}
                  >
                    DOZA
                  </span>
                </div>
              </div>

              {/* Heading — scaled for small screens */}
              <header className="mb-6 sm:mb-10 text-left">
                <h2
                  className={`text-4xl sm:text-5xl font-bold text-slate-700 mb-2 ${bebasNeue.className}`}
                >
                  Sign In
                </h2>
                <p className="text-sm sm:text-base text-slate-500 font-medium">
                  Manage your health journey with Doza.
                </p>
              </header>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-5 sm:mb-8 p-3.5 sm:p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2.5 sm:gap-3 text-red-600 text-sm"
                >
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Authentication Error</p>
                    <p className="opacity-80">{error}</p>
                  </div>
                </motion.div>
              )}

              <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
                {/* Email */}
                <div>
                  <div className="flex justify-between items-end mb-2 ml-1 gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Email Address
                    </label>
                    {fieldErrors.email && (
                      <span className="text-[10px] font-bold text-red-500 uppercase italic truncate">
                        {fieldErrors.email}
                      </span>
                    )}
                  </div>
                  <div className="relative group">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors pointer-events-none"
                      size={18}
                    />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      autoComplete="email"
                      inputMode="email"
                      autoCapitalize="off"
                      className={`w-full bg-slate-100 border-2 rounded-2xl py-4 pl-12 pr-4 text-base sm:text-sm font-bold text-slate-900 transition-all outline-none 
                        ${fieldErrors.email ? "border-red-200 bg-red-50/30" : "border-transparent focus:bg-white focus:border-emerald-500"}`}
                      placeholder="e.g. name@company.com"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-end mb-2 ml-1 gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Password
                    </label>
                    <a
                      href="/forgot-password"
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-widest transition-colors"
                    >
                      Forgot?
                    </a>
                  </div>
                  <div className="relative group">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors pointer-events-none"
                      size={18}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      autoComplete="current-password"
                      className={`w-full bg-slate-100 border-2 rounded-2xl py-4 pl-12 pr-12 text-base sm:text-sm font-bold text-slate-900 transition-all outline-none 
                        ${fieldErrors.password ? "border-red-200 bg-red-50/30" : "border-transparent focus:bg-white focus:border-emerald-500"}`}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Remember device — custom rounded emerald checkbox */}
                <label className="flex items-center gap-3 py-1 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only peer"
                  />
                  <span
                    className="w-5 h-5 shrink-0 rounded-md border-2 border-slate-300 bg-white flex items-center justify-center transition-all duration-200
                      peer-checked:bg-emerald-600 peer-checked:border-emerald-600
                      peer-focus-visible:ring-4 peer-focus-visible:ring-emerald-500/20
                      group-hover:border-emerald-400"
                  >
                    <Check
                      className={`w-3.5 h-3.5 text-white transition-opacity duration-150 ${
                        rememberMe ? "opacity-100" : "opacity-0"
                      }`}
                      strokeWidth={3}
                    />
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Remember this device
                  </span>
                </label>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading || hasErrors()}
                  className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-black py-4 sm:py-5 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 group shadow-2xl shadow-slate-900/10 disabled:opacity-50 disabled:bg-slate-300 disabled:shadow-none"
                >
                  {loading ? (
                    <RefreshCw className="animate-spin" size={20} />
                  ) : (
                    <>
                      SIGN IN{" "}
                      <ArrowRight
                        size={18}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </>
                  )}
                </motion.button>
              </form>

              <footer className="mt-8 sm:mt-12 text-center">
                <p className="text-sm text-slate-500 font-medium">
                  Don't have an account?{" "}
                  <a
                    href={DOZA_HOME_URL}
                    className="text-emerald-600 font-black hover:underline underline-offset-4"
                  >
                    CREATE ONE
                  </a>
                </p>

                <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-slate-100 flex items-center justify-center gap-6">
                  <a
                    href={DOZA_HOME_URL}
                    className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 transition-colors"
                  >
                    <ChevronLeft size={14} /> Back to Site
                  </a>
                </div>
              </footer>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
