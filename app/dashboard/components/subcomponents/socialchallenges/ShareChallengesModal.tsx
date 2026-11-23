"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { motion } from "framer-motion";
import {
  X,
  Share2,
  Copy,
  Check,
  Facebook,
  Send,
  Mail,
  Instagram,
  Smartphone,
  Link2,
  Wand2,
} from "lucide-react";
import { cn } from "@/app/utils/utils";

function XIcon({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function WhatsAppIcon({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const REGISTER_URL = "https://dozamedic.com/registration/user";

const UTM = {
  utm_source: "challenge_share",
  utm_medium: "user_share",
  utm_campaign: "join_challenge",
} as const;

export type ChallengeShareData = {
  id: string;
  name: string;
  activity: string;
  targetValue: number;
  targetUnit: string;
  description?: string;
  isPublic: boolean;
  code?: string | null;
};

function buildShareUrl(userId?: string): string {
  try {
    const u = new URL(REGISTER_URL);
    Object.entries(UTM).forEach(([k, v]) => u.searchParams.set(k, v));
    if (userId) u.searchParams.set("sharedBy", userId);
    return u.toString();
  } catch {
    return REGISTER_URL;
  }
}

function buildDefaultMessage(
  challenge: ChallengeShareData,
  shareUrl: string,
): string {
  const goal = `${challenge.targetValue} ${challenge.targetUnit}`;
  const lines: string[] = [
    `🏆 Join me for "${challenge.name}" on Doza!`,
    "",
    `🎯 Goal: ${goal} · ${challenge.activity}`,
  ];

  if (challenge.description) {
    const desc =
      challenge.description.length > 90
        ? challenge.description.slice(0, 87) + "…"
        : challenge.description;
    lines.push("", desc);
  }

  lines.push("");

  if (challenge.isPublic) {
    lines.push(
      `Sign up free, then open the Challenges tab and search for "${challenge.name}":`,
      shareUrl,
    );
  } else {
    lines.push(
      `This is a private challenge.` +
        (challenge.code ? ` Invite code: ${challenge.code}` : ""),
      "",
      `Sign up free, then open the Challenges tab, search "${challenge.name}" and enter the code:`,
      shareUrl,
    );
  }

  return lines.join("\n");
}

export default function ShareChallengeModal({
  challenge,
  userId,
  onShared,
  onClose,
}: {
  challenge: ChallengeShareData;
  /** Used to append `sharedBy=<uid>` to the URL — personal referral tag. */
  userId?: string;
  /** Fires once per modal session, the first time the user shares. */
  onShared?: (url: string, method: string) => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const userEditedRef = useRef(false);
  const hasLoggedRef = useRef(false);

  const shareUrl = useMemo(() => buildShareUrl(userId), [userId]);
  const defaultMessage = useMemo(
    () => buildDefaultMessage(challenge, shareUrl),
    [challenge, shareUrl],
  );

  const [customMessage, setCustomMessage] = useState(defaultMessage);

  useEffect(() => {
    if (!userEditedRef.current) setCustomMessage(defaultMessage);
  }, [defaultMessage]);

  const handleMessageChange = (value: string) => {
    userEditedRef.current = true;
    setCustomMessage(value.slice(0, 400));
  };

  const fullText = useMemo(() => {
    const trimmed = customMessage.trim();
    return trimmed.includes(shareUrl) ? trimmed : `${trimmed}\n\n${shareUrl}`;
  }, [customMessage, shareUrl]);

  const canWebShare = useMemo(
    () =>
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    [],
  );

  // Fire onShared exactly once per modal open, on the first actual share action
  const logShare = useCallback(
    (method: string) => {
      if (hasLoggedRef.current) return;
      hasLoggedRef.current = true;
      try {
        onShared?.(shareUrl, method);
      } catch (e) {
        console.warn("[share] onShared threw:", e);
      }
    },
    [onShared, shareUrl],
  );

  const copyToClipboard = useCallback(
    async (text: string, method = "copy") => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        logShare(method);
      } catch {}
    },
    [logShare],
  );

  const handleNativeShare = useCallback(async () => {
    if (!canWebShare) return;
    try {
      await navigator.share({
        title: `Join "${challenge.name}" on Doza`,
        text: customMessage.trim(),
        url: shareUrl,
      });
      logShare("native");
    } catch (err: any) {
      if (err?.name !== "AbortError")
        console.warn("[share] native failed:", err);
    }
  }, [canWebShare, customMessage, shareUrl, challenge.name, logShare]);

  const openExternal = (url: string, method: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    logShare(method);
  };

  const handleWhatsApp = () =>
    openExternal(
      `https://wa.me/?text=${encodeURIComponent(fullText)}`,
      "whatsapp",
    );
  const handleX = () =>
    openExternal(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        customMessage.trim(),
      )}&url=${encodeURIComponent(shareUrl)}`,
      "x",
    );
  const handleFacebook = () =>
    openExternal(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      "facebook",
    );
  const handleTelegram = () =>
    openExternal(
      `https://t.me/share/url?url=${encodeURIComponent(
        shareUrl,
      )}&text=${encodeURIComponent(customMessage.trim())}`,
      "telegram",
    );
  const handleEmail = () =>
    openExternal(
      `mailto:?subject=${encodeURIComponent(
        `Join "${challenge.name}" on Doza`,
      )}&body=${encodeURIComponent(fullText)}`,
      "email",
    );
  const handleSMS = () =>
    openExternal(`sms:?&body=${encodeURIComponent(fullText)}`, "sms");
  const handleInstagram = () => {
    if (canWebShare) handleNativeShare();
    else copyToClipboard(fullText, "instagram");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "6%", scale: 0.99, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: "6%", scale: 0.99, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="bg-white w-full sm:max-w-md sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[90vh] border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <img
                src="/logo.png"
                alt="Doza"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-900 truncate">
                Share this challenge
              </p>
              <p className="text-[10px] text-emerald-700/70 truncate">
                Invite friends to "{challenge.name}"
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-100 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              Message preview
            </p>
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed break-words">
              {customMessage}
            </p>
            {!customMessage.includes(shareUrl) && (
              <p className="text-[11px] text-emerald-700 font-semibold break-all">
                {shareUrl}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowCustomize((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 transition-colors"
          >
            <Wand2 size={12} />
            {showCustomize ? "Hide message editor" : "Personalize message"}
          </button>

          {showCustomize && (
            <textarea
              value={customMessage}
              onChange={(e) => handleMessageChange(e.target.value)}
              rows={5}
              placeholder="Add your own words…"
              className="w-full resize-none px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none"
            />
          )}

          {canWebShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full min-h-12 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-colors shadow-sm"
            >
              <Share2 size={16} /> Share via…
            </button>
          )}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Or choose a platform
            </p>
            <div className="grid grid-cols-4 gap-2">
              <ShareButton
                label="WhatsApp"
                icon={WhatsAppIcon}
                bg="bg-[#25D366]"
                onClick={handleWhatsApp}
              />
              <ShareButton
                label="X"
                icon={XIcon}
                bg="bg-black"
                onClick={handleX}
              />
              <ShareButton
                label="Facebook"
                icon={Facebook}
                bg="bg-[#1877F2]"
                onClick={handleFacebook}
              />
              <ShareButton
                label="Telegram"
                icon={Send}
                bg="bg-[#229ED9]"
                onClick={handleTelegram}
              />
              <ShareButton
                label="Email"
                icon={Mail}
                bg="bg-slate-600"
                onClick={handleEmail}
              />
              <ShareButton
                label="SMS"
                icon={Smartphone}
                bg="bg-emerald-600"
                onClick={handleSMS}
              />
              <ShareButton
                label="Instagram"
                icon={Instagram}
                bg="bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]"
                onClick={handleInstagram}
              />
              <ShareButton
                label={copied ? "Copied" : "Copy"}
                icon={copied ? Check : Copy}
                bg={copied ? "bg-emerald-600" : "bg-slate-700"}
                onClick={() => copyToClipboard(fullText, "copy")}
              />
            </div>
          </div>

          <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
            <Instagram size={12} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              <span className="font-bold">Instagram:</span>{" "}
              {canWebShare
                ? "tap the button above — your phone will show Instagram in the share sheet."
                : "tap Copy, then paste the message in your Instagram caption or story."}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Or share the sign-up link
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                <Link2 size={12} className="text-slate-400 shrink-0" />
                <span className="text-[11px] text-slate-700 font-medium truncate">
                  {shareUrl}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(shareUrl, "copy-link")}
                aria-label="Copy link"
                className={cn(
                  "min-h-10 min-w-10 inline-flex items-center justify-center rounded-xl transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                  copied
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                )}
              >
                {copied ? (
                  <Check size={14} strokeWidth={3} />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
              Friends without an account land on sign-up. Once registered, they
              open the Challenges tab and search <b>"{challenge.name}"</b>
              {!challenge.isPublic && challenge.code ? (
                <>
                  {" "}
                  with the code <b>{challenge.code}</b>
                </>
              ) : null}
              .
            </p>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="text-center text-[10px] text-slate-500">
            Every challenge is easier with a friend 💚
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ShareButton({
  label,
  icon: Icon,
  bg,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  bg: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group"
      aria-label={`Share via ${label}`}
    >
      <div
        className={cn(
          "w-12 h-12 rounded-2xl inline-flex items-center justify-center text-white shadow-sm transition-transform group-active:scale-95 group-hover:scale-105",
          bg,
        )}
      >
        <Icon size={20} />
      </div>
      <span className="text-[10px] font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
        {label}
      </span>
    </button>
  );
}
