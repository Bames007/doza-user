// app/utils/useBackGuard.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isChatBackGuarded } from "@/app/utils/chat-seen-state";

interface UseBackGuardOptions {
  activePanel: string;
  rootPanel?: string;
  onReturnHome: () => void;
  enabled?: boolean;
  debug?: boolean;
}

interface UseBackGuardResult {
  showExitConfirm: boolean;
  confirmExit: () => void;
  cancelExit: () => void;
}

export function useBackGuard({
  activePanel,
  rootPanel = "dashboard",
  onReturnHome,
  enabled = true,
  debug = false,
}: UseBackGuardOptions): UseBackGuardResult {
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const activePanelRef = useRef(activePanel);
  const rootPanelRef = useRef(rootPanel);
  const onReturnHomeRef = useRef(onReturnHome);
  const confirmedRef = useRef(false);

  const log = useCallback(
    (...args: any[]) => {
      if (debug) console.log("[useBackGuard]", ...args);
    },
    [debug],
  );

  useEffect(() => {
    activePanelRef.current = activePanel;
  }, [activePanel]);
  useEffect(() => {
    rootPanelRef.current = rootPanel;
  }, [rootPanel]);
  useEffect(() => {
    onReturnHomeRef.current = onReturnHome;
  }, [onReturnHome]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    // Push a sentinel history entry on mount so pressing "Back" triggers
    // popstate instead of leaving the app.
    const initSentinel = () => {
      try {
        const state = window.history.state;
        if (!state || !state.__dozaBackGuard) {
          window.history.pushState(
            { __dozaBackGuard: true },
            "",
            window.location.href,
          );
          log("Initialized sentinel history state");
        }
      } catch (err) {
        log("initSentinel failed", err);
      }
    };

    initSentinel();

    const handlePopState = (event: PopStateEvent) => {
      if (confirmedRef.current) {
        log("popstate ignored (already confirmed exit)");
        return;
      }

      // 🔴 NEW: if a chat overlay is mounted, it owns the back gesture.
      //     Its own popstate listener will call onClose(). We must not
      //     touch history, navigate panels, or show the exit-confirm
      //     modal — otherwise the user sees the modal behind the chat
      //     and the chat never closes.
      if (isChatBackGuarded()) {
        log("popstate ignored (chat is open)");
        return;
      }

      // Re-establish the sentinel immediately so future back presses keep working
      initSentinel();

      const currentPanel = activePanelRef.current;
      const targetRoot = rootPanelRef.current;
      const onRoot = currentPanel === targetRoot;

      log("popstate triggered", { currentPanel, targetRoot, onRoot });

      if (!onRoot) {
        // If we are deep inside a sub-panel, return home first
        onReturnHomeRef.current();
      } else {
        // If we are already on the dashboard (root), trigger the exit confirmation modal
        setShowExitConfirm(true);
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      log("unmounting back guard");
      window.removeEventListener("popstate", handlePopState);
    };
  }, [enabled, log]);

  const confirmExit = useCallback(() => {
    confirmedRef.current = true;
    setShowExitConfirm(false);
    if (typeof window === "undefined") return;

    setTimeout(() => {
      try {
        window.history.go(-2); // Step past our sentinel and app history
      } catch {
        window.location.replace("/");
      }
    }, 50);
  }, []);

  const cancelExit = useCallback(() => {
    setShowExitConfirm(false);
    confirmedRef.current = false;
  }, []);

  return { showExitConfirm, confirmExit, cancelExit };
}
