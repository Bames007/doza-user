"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Mail,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  ShieldCheck,
  KeyRound,
  Lock,
} from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { bebasNeue, poppins } from "../constants";
import { auth } from "../utils/firebaseConfig";
import { cn } from "@/app/utils/utils";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email.trim()) {
      setError("Email address is required");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: any) {
      console.error("Password reset error:", err);
      let message = "Failed to send reset email. Please try again.";
      if (err.code === "auth/user-not-found") {
        message = "No account found with this email address.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Too many requests. Please try again later.";
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden",
        poppins.className,
      )}
    >
      {/* Background Depth Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-15%] right-[-5%] w-[600px] h-[600px] bg-emerald-100/40 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-white border border-slate-100 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] p-8 md:p-12 relative overflow-hidden">
          <div className="relative z-10">
            {/* Header with Dashboard Styling */}
            <header className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <Lock className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                  Secure Recovery
                </p>
              </div>

              <h1
                className={cn(
                  "text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.8] uppercase",
                  bebasNeue.className,
                )}
              >
                Account <br /> <span className="text-emerald-500">Restore</span>
              </h1>
            </header>

            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-8"
                >
                  <div className="p-8 bg-slate-900 rounded-[2rem] text-white shadow-2xl shadow-emerald-900/20 relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mb-6">
                        <CheckCircle className="w-7 h-7" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">Link Sent</h3>
                      <p className="text-slate-400 text-sm leading-relaxed font-medium">
                        Verification instructions have been dispatched to{" "}
                        <span className="text-emerald-400 font-bold">
                          {email}
                        </span>
                        .
                      </p>
                    </div>
                    {/* Abstract circle decor */}
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
                  </div>

                  <button
                    onClick={() => router.push("/")}
                    className="w-full py-4 bg-slate-100 text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all active:scale-[0.98]"
                  >
                    <ArrowLeft size={18} />
                    Back to Sign In
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Registered Email
                      </label>
                      <div className="relative group">
                        <Mail
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors"
                          size={20}
                        />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@medical-hub.com"
                          className="w-full pl-12 pr-4 py-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-emerald-500 outline-none transition-all text-slate-900 font-semibold text-sm placeholder:text-slate-300"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold"
                      >
                        <AlertCircle size={16} />
                        {error}
                      </motion.div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <motion.button
                      whileHover={{ scale: 1.01, backgroundColor: "#10b981" }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading}
                      className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-bold shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-50 transition-all"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <>
                          <KeyRound size={20} className="text-emerald-400" />
                          <span>Request Recovery Link</span>
                        </>
                      )}
                    </motion.button>

                    <button
                      type="button"
                      onClick={() => router.push("/")}
                      className="w-full py-2 text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] hover:text-slate-900 transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowLeft size={12} />
                      Cancel & Return
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Branding Footer */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-md border border-slate-200 rounded-full">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              End-to-End Encryption Enabled
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
