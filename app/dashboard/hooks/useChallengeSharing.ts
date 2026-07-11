"use client";

import { useState } from "react";

export function useChallengeSharing() {
  const [copied, setCopied] = useState(false);

  const getShareLink = (challengeId: string, code?: string) => {
    const base = `${window.location.origin}/challenges/${challengeId}`;
    return code ? `${base}?code=${code}` : base;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    }
  };

  const shareViaWebShare = async (
    challengeName: string,
    challengeId: string,
    code?: string,
  ) => {
    const url = getShareLink(challengeId, code);
    if (navigator.share) {
      await navigator.share({
        title: `Join my challenge: ${challengeName}`,
        text: `Come compete with me in "${challengeName}" on Doza!${code ? ` Use code: ${code}` : ""}`,
        url,
      });
    } else {
      await copyToClipboard(url);
    }
  };

  return { copied, getShareLink, copyToClipboard, shareViaWebShare };
}
