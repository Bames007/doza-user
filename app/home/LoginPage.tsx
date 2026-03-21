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
  Activity,
  Clock,
  Phone,
  RefreshCw,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { bebasNeue, poppins } from "../constants";
import Image from "next/image";
import LoadingScreen from "../components/LoadingScreen";

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
      // 1. Call user-login API
      const loginRes = await fetch("/api/auth/user-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          rememberMe,
        }),
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        throw new Error(loginData.error || "Login failed");
      }

      // 2. Set session cookie via set-session API
      const sessionRes = await fetch("/api/auth/set-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData.data),
      });

      if (!sessionRes.ok) {
        throw new Error("Failed to establish secure session");
      }

      // 3. Store in localStorage for client convenience
      localStorage.setItem("userSession", JSON.stringify(loginData.data));
      localStorage.setItem("loginTime", new Date().toISOString());

      // 4. Redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return (
    <>
      {loading && <LoadingScreen />}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Left side - unchanged */}
            <div className="relative bg-gradient-to-br from-green-600 to-emerald-700 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-800 to-emerald-900">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d')] bg-cover bg-center opacity-20"></div>
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:20px_20px]"></div>
              </div>

              <div className="relative z-10 h-full flex flex-col justify-between p-8 lg:p-12 text-white">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 mb-8"
                >
                  <div className="w-12 h-12 bg-white/80 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Image
                      alt="Doza Logo"
                      src="/logo.png"
                      height={30}
                      width={30}
                      className="w-10 h-10"
                    />
                  </div>
                  <div>
                    <span
                      className={`text-2xl font-bold ${bebasNeue.className}`}
                    >
                      DOZA
                    </span>
                    <p className={`text-white/60 text-sm ${poppins.className}`}>
                      Personal Health Assistant
                    </p>
                  </div>
                </motion.div>

                <div className="flex-1 flex flex-col justify-center">
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`text-4xl lg:text-5xl font-bold mb-6 ${bebasNeue.className}`}
                  >
                    Your Health Journey
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`text-xl text-white/90 mb-8 leading-relaxed ${poppins.className}`}
                  >
                    Securely access your health records, track progress, and
                    connect with healthcare providers.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-4"
                  >
                    {[
                      {
                        icon: Shield,
                        title: "Secure & Private",
                        description:
                          "Your health data is encrypted and protected",
                      },
                      {
                        icon: Activity,
                        title: "Personal Dashboard",
                        description:
                          "Track your health metrics and appointments",
                      },
                      {
                        icon: Clock,
                        title: "24/7 Access",
                        description: "Access your records anytime, anywhere",
                      },
                    ].map((feature, index) => (
                      <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                        className="flex items-center gap-4"
                      >
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                          <feature.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <div
                            className={`font-semibold text-lg ${poppins.className}`}
                          >
                            {feature.title}
                          </div>
                          <div
                            className={`text-white/80 text-sm ${poppins.className}`}
                          >
                            {feature.description}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Right side - Login Form */}
            <div className="p-8 lg:p-12">
              <div className="max-w-md mx-auto w-full">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-8"
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="w-16 h-16 bg-gradient-to-br from-white-500 to-emerald-300 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
                  >
                    <Image
                      src="/logo.png"
                      alt="Doza Logo"
                      height={45}
                      width={45}
                      className="w-16 h-16"
                    />
                  </motion.div>
                  <h2
                    className={`text-2xl font-bold text-gray-900 mb-2 ${bebasNeue.className}`}
                  >
                    Welcome Back
                  </h2>
                  <p className={`text-gray-600 ${poppins.className}`}>
                    Sign in to your Doza health account
                  </p>
                </motion.div>

                {/* Error Display */}
                {(error || Object.values(fieldErrors).some((err) => err)) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-3 mb-6"
                  >
                    {error && (
                      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p
                            className={`text-sm font-medium ${poppins.className}`}
                          >
                            Login Failed
                          </p>
                          <p className={`text-sm mt-1 ${poppins.className}`}>
                            {error}
                          </p>
                          <button
                            onClick={() => setError("")}
                            className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-lg mt-2 transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}
                    {Object.values(fieldErrors).some((err) => err) && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p
                          className={`text-sm font-medium text-amber-800 ${poppins.className} flex items-center gap-2`}
                        >
                          <AlertCircle className="w-4 h-4" />
                          Please fix the following:
                        </p>
                        <ul className="text-xs text-amber-700 mt-1 list-disc list-inside">
                          {fieldErrors.email && (
                            <li>Email: {fieldErrors.email}</li>
                          )}
                          {fieldErrors.password && (
                            <li>Password: {fieldErrors.password}</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Form */}
                <motion.form
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  onSubmit={handleLogin}
                  className="space-y-6"
                  noValidate
                >
                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className={`block text-sm font-medium text-gray-700 mb-2 ${poppins.className}`}
                    >
                      Email Address *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        required
                        className={`block w-full text-gray-900 pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:border-green-500 transition-colors duration-200 bg-white ${
                          fieldErrors.email
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-green-500"
                        }`}
                        placeholder="you@example.com"
                        disabled={loading}
                      />
                      {fieldErrors.email && (
                        <button
                          type="button"
                          onClick={() => clearFieldError("email")}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {fieldErrors.email ? (
                      <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {fieldErrors.email}
                      </p>
                    ) : (
                      <p className="text-gray-500 text-xs mt-1">
                        Enter the email you used to register
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="password"
                      className={`block text-sm font-medium text-gray-700 mb-2 ${poppins.className}`}
                    >
                      Password *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        required
                        className={`block w-full text-gray-900 pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:border-green-500 transition-colors duration-200 bg-white ${
                          fieldErrors.password
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-green-500"
                        }`}
                        placeholder="••••••••"
                        disabled={loading}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center">
                        {fieldErrors.password && (
                          <button
                            type="button"
                            onClick={() => clearFieldError("password")}
                            className="p-2 text-red-500 hover:text-red-700"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                          disabled={loading}
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    {fieldErrors.password ? (
                      <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {fieldErrors.password}
                      </p>
                    ) : (
                      <p className="text-gray-500 text-xs mt-1">
                        Minimum 6 characters
                      </p>
                    )}
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span
                        className={`text-sm text-gray-700 ${poppins.className}`}
                      >
                        Remember me
                      </span>
                    </label>
                    <a
                      href="/forgot-password"
                      className={`text-sm text-green-600 hover:text-green-700 ${poppins.className}`}
                    >
                      Forgot password?
                    </a>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={loading || hasErrors()}
                    whileHover={{ scale: loading || hasErrors() ? 1 : 1.02 }}
                    whileTap={{ scale: loading || hasErrors() ? 1 : 0.98 }}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <span
                      className={`${poppins.className} flex items-center justify-center gap-2`}
                    >
                      {loading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          />
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </span>
                  </motion.button>
                </motion.form>

                {/* Register Link */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 text-center"
                >
                  <p className={`text-sm text-gray-600 ${poppins.className}`}>
                    Don't have an account?{" "}
                    <a
                      href="/register"
                      className="text-green-600 font-medium hover:text-green-700"
                    >
                      Create one now
                    </a>
                  </p>
                </motion.div>

                {/* Support */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-8 pt-6 border-t border-gray-200"
                >
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <a
                      href="mailto:support@doza.com"
                      className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      <span className={poppins.className}>
                        support@doza.com
                      </span>
                    </a>
                    <a
                      href="tel:+2348127728084"
                      className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      <span className={poppins.className}>Call Support</span>
                    </a>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
