// app/components/PaystackScript.tsx

"use client";

import { useEffect } from "react";

export default function PaystackScript() {
  useEffect(() => {
    // Only load once
    if (document.querySelector('script[src*="paystack"]')) return;

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup not needed for paystack, but if you want:
      // document.body.removeChild(script);
    };
  }, []);

  return null;
}
