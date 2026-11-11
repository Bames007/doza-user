// app/dashboard/components/SecurePdfViewer.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldAlert, FileText, Maximize2 } from "lucide-react";
import { cn } from "@/app/utils/utils";
import { fetchFile } from "@/app/utils/fireStore";

interface SecurePdfViewerProps {
  url: string;
  fileName?: string | null;
  watermarkText: string;
  maxHeightClass?: string;
  onMaximize?: () => void;
  fillHeight?: boolean;
}

export default function SecurePdfViewer({
  url,
  fileName,
  watermarkText,
  maxHeightClass = "max-h-[440px]",
  onMaximize,
  fillHeight = false,
}: SecurePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    async function render() {
      setLoading(true);
      setError(null);
      container!.innerHTML = "";

      try {
        // ✅ Use the shared file cache — one fetch per session
        const dataUrl = await fetchFile(url);
        const base64 = dataUrl.split(",")[1];
        if (!base64) throw new Error("Invalid data URL");

        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

        const pdf = await pdfjs.getDocument({ data: bytes }).promise;

        if (cancelled) return;
        setPageCount(pdf.numPages);

        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 * dpr });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          canvas.style.borderRadius = "8px";
          canvas.style.marginBottom = "8px";
          canvas.style.backgroundColor = "#ffffff";
          canvas.addEventListener("contextmenu", (e) => e.preventDefault());
          container!.appendChild(canvas);

          await page.render({
            canvas,
            canvasContext: canvas.getContext("2d")!,
            viewport,
          }).promise;

          page.cleanup();
        }

        if (!cancelled) setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          console.error("[SecurePdfViewer]", err);
          setError("Unable to load document.");
          setLoading(false);
        }
      }
    }

    render();

    return () => {
      cancelled = true;
      if (container) container.innerHTML = "";
    };
  }, [url]);

  useEffect(() => {
    const onBlur = () => {
      if (containerRef.current) {
        containerRef.current.style.filter = "blur(18px)";
        containerRef.current.style.transition = "filter 120ms";
      }
    };
    const onFocus = () => {
      if (containerRef.current) containerRef.current.style.filter = "none";
    };
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <>
      {/* ✅ Emits the .chat-scroll style once per viewer mount.
          Safe with multiple instances — same CSS, browser dedupes. */}
      <style jsx global>{`
        .chat-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(5, 150, 105, 0.25) transparent;
        }
        .chat-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .chat-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-scroll::-webkit-scrollbar-thumb {
          background: rgba(5, 150, 105, 0.2);
          border-radius: 9999px;
        }
        .chat-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(5, 150, 105, 0.4);
        }
      `}</style>

      <div
        className={cn(
          "relative w-full bg-slate-100 border border-slate-200 overflow-hidden",
          fillHeight
            ? "h-full flex flex-col rounded-none border-0"
            : "max-w-[340px] rounded-xl",
        )}
      >
        <div
          aria-hidden
          className="absolute inset-0 z-10 pointer-events-none select-none overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage: `repeating-linear-gradient(
                -30deg,
                transparent 0,
                transparent 60px,
                rgba(5, 150, 105, 0.35) 60px,
                rgba(5, 150, 105, 0.35) 62px
              )`,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-emerald-900/25 rotate-[-30deg] whitespace-nowrap select-none px-4">
              {watermarkText}
            </span>
          </div>
        </div>

        <div className="relative z-20 shrink-0 flex items-center gap-2 px-2.5 py-2 bg-white/95 border-b border-slate-200 backdrop-blur-sm">
          <div className="w-7 h-7 rounded-md bg-rose-50 flex items-center justify-center shrink-0">
            <FileText size={14} className="text-rose-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-900 truncate">
              {fileName || "Document.pdf"}
            </p>
            <p className="text-[9px] text-slate-500 flex items-center gap-1">
              <ShieldAlert size={8} className="text-emerald-600" />
              Preview only ·{" "}
              {pageCount > 0
                ? `${pageCount} page${pageCount > 1 ? "s" : ""}`
                : "loading"}
            </p>
          </div>
          {onMaximize && (
            <button
              type="button"
              onClick={onMaximize}
              aria-label="View full screen"
              className="shrink-0 min-h-7 min-w-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <Maximize2 size={13} />
            </button>
          )}
        </div>

        <div
          ref={containerRef}
          className={cn(
            // ✅ chat-scroll added — thin emerald scrollbar
            "relative z-[15] overflow-y-auto bg-slate-100 p-2 select-none chat-scroll",
            fillHeight ? "flex-1 min-h-0" : maxHeightClass,
          )}
          style={{ userSelect: "none", WebkitUserSelect: "none" }}
          onContextMenu={(e) => e.preventDefault()}
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          onClick={onMaximize}
          role={onMaximize ? "button" : undefined}
          tabIndex={onMaximize ? 0 : undefined}
        />

        {loading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-100 pt-10">
            <Loader2 size={22} className="animate-spin text-emerald-600" />
            <p className="mt-2 text-[11px] font-semibold text-slate-500">
              Loading document…
            </p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-100 px-4 pt-10">
            <ShieldAlert size={22} className="text-rose-500" />
            <p className="mt-2 text-[11px] font-semibold text-rose-700 text-center">
              {error}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
