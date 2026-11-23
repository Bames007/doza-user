"use client";
import { useCallback, useMemo, useState } from "react";
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
  Download,
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

const SHARE_BASE_URL = "https://dozamedic.com";

export default function ShareWorkoutModal({
  imageDataUrl,
  caption,
  onClose,
}: {
  imageDataUrl: string;
  caption: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    const u = new URL(SHARE_BASE_URL);
    u.searchParams.set("utm_source", "workout_share");
    u.searchParams.set("utm_medium", "user_share");
    return u.toString();
  }, []);

  const fullText = `${caption}\n\n${shareUrl}`;

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard?.writeText)
        await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, []);

  const downloadImage = useCallback(() => {
    const a = document.createElement("a");
    a.href = imageDataUrl;
    a.download = "doza-workout.png";
    a.click();
  }, [imageDataUrl]);

  const handleNativeShare = useCallback(async () => {
    try {
      const blob = await (await fetch(imageDataUrl)).blob();
      const file = new File([blob], "doza-workout.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: caption, url: shareUrl });
        return;
      }
      // Fallback: text-only share + download image
      downloadImage();
      await navigator.share({
        title: "My Doza workout",
        text: caption,
        url: shareUrl,
      });
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        downloadImage();
        copyToClipboard(fullText);
      }
    }
  }, [
    imageDataUrl,
    caption,
    shareUrl,
    downloadImage,
    copyToClipboard,
    fullText,
  ]);

  const openExternal = (url: string) =>
    window.open(url, "_blank", "noopener,noreferrer");
  const handleWhatsApp = () =>
    openExternal(`https://wa.me/?text=${encodeURIComponent(fullText)}`);
  const handleX = () =>
    openExternal(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(shareUrl)}`,
    );
  const handleFacebook = () =>
    openExternal(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    );
  const handleTelegram = () =>
    openExternal(
      `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(caption)}`,
    );
  const handleEmail = () =>
    openExternal(
      `mailto:?subject=${encodeURIComponent("My Doza Medic Fitness Workout")}&body=${encodeURIComponent(fullText)}`,
    );
  const handleSMS = () =>
    openExternal(`sms:?&body=${encodeURIComponent(fullText)}`);
  const handleInstagram = () => copyToClipboard(fullText);
  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[430] bg-slate-950/70 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-4"
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
                Share your workout
              </p>
              <p className="text-[10px] text-emerald-700/70 truncate">
                Image + caption
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-100 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
            <img
              src={imageDataUrl}
              alt="Workout summary"
              className="w-full h-auto block"
            />
          </div>

          <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-3 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              Caption
            </p>
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {caption}
            </p>
          </div>

          {canNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full min-h-12 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-colors shadow-sm"
            >
              <Share2 size={16} />
              Share image + caption
            </button>
          )}

          <button
            type="button"
            onClick={downloadImage}
            className="w-full min-h-11 inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
          >
            <Download size={14} />
            Download image
          </button>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Share text link
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
                onClick={() => copyToClipboard(fullText)}
              />
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Or share the link
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
                onClick={() => copyToClipboard(shareUrl)}
                className={cn(
                  "min-h-10 min-w-10 inline-flex items-center justify-center rounded-xl shrink-0 transition-colors",
                  copied
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                )}
                aria-label="Copy link"
              >
                {copied ? (
                  <Check size={14} strokeWidth={3} />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="text-center text-[10px] text-slate-500">
            Image downloaded automatically when sharing to platforms — attach it
            to your post.
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
