"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function StorageCheckBanner() {
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Test localStorage and cookies
  useEffect(() => {
    const checkStorage = () => {
      try {
        // Test localStorage
        const testKey = "__test__";
        localStorage.setItem(testKey, "test");
        localStorage.removeItem(testKey);

        // Test cookies (optional, but good to check)
        document.cookie = "testCookie=1; path=/; max-age=10";
        if (document.cookie.indexOf("testCookie") === -1) {
          throw new Error("Cookies disabled");
        }
        document.cookie =
          "testCookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

        setStorageBlocked(false);
      } catch (e) {
        console.warn("Storage/cookies are blocked:", e);
        setStorageBlocked(true);
      }
    };

    checkStorage();
  }, []);

  const handleAllow = () => {
    // Re-check after user clicks "Allow"
    try {
      const testKey = "__test__";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      document.cookie = "testCookie=1; path=/; max-age=10";
      if (document.cookie.indexOf("testCookie") === -1) throw new Error();
      document.cookie =
        "testCookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      setStorageBlocked(false);
      setDismissed(true);
    } catch {
      setShowInstructions(true);
    }
  };

  if (!storageBlocked || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
      >
        <div className="mx-auto max-w-4xl bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl shadow-2xl border border-white/20 backdrop-blur-sm">
          <div className="relative p-5 md:p-6">
            <button
              onClick={() => setDismissed(true)}
              className="absolute top-3 right-3 text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="pr-8">
              <h3 className="text-lg font-semibold mb-2">
                Enable cookies & storage
              </h3>
              <p className="text-sm text-white/90 mb-4">
                DozaMedic needs cookies and local storage to keep you logged in
                and ensure all features work correctly. Your privacy is
                important – we only store essential data for authentication.
              </p>

              {!showInstructions ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleAllow}
                    className="px-5 py-2 bg-white text-amber-700 rounded-xl font-medium hover:bg-amber-50 transition shadow-lg"
                  >
                    I've enabled cookies
                  </button>
                  <button
                    onClick={() => setShowInstructions(true)}
                    className="px-5 py-2 bg-white/20 text-white rounded-xl hover:bg-white/30 transition"
                  >
                    How to enable
                  </button>
                </div>
              ) : (
                <div className="bg-white/10 rounded-xl p-4 text-sm">
                  <p className="font-medium mb-2">
                    To enable cookies in Chrome:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1 text-white/80">
                    <li>Click the lock icon next to the URL</li>
                    <li>
                      Go to <strong>Site settings</strong>
                    </li>
                    <li>
                      Under <strong>Cookies</strong>, select{" "}
                      <strong>Allow</strong>
                    </li>
                    <li>Refresh the page</li>
                  </ol>
                  <p className="mt-3 text-white/70">
                    For other browsers, check your browser's privacy settings.
                  </p>
                  <button
                    onClick={() => {
                      setShowInstructions(false);
                      handleAllow();
                    }}
                    className="mt-3 px-4 py-2 bg-white text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50"
                  >
                    I've enabled them – check again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
