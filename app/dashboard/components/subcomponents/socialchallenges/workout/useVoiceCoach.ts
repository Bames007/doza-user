"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const PROMPTS = [
  "You're doing great. Keep pushing.",
  "Stay strong. Every step counts.",
  "You've got this. Keep the pace.",
  "Halfway there. Don't stop now.",
  "Nice work. Keep breathing steady.",
  "You're stronger than you think.",
];

function pickVoice(voices: SpeechSynthesisVoice[]) {
  if (!voices.length) return null;
  return (
    voices.find((v) => /samantha|google uk english female/i.test(v.name)) ||
    voices.find((v) => /^en[-_]?/i.test(v.lang)) ||
    voices[0]
  );
}

export function useVoiceCoach({ enabled }: { enabled: boolean }) {
  const lastSpokeRef = useRef(0);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const [voicesReady, setVoicesReady] = useState(false);

  // Chrome/Safari load voices asynchronously — wait for `voiceschanged`
  // before picking one. Otherwise `getVoices()` returns [] and `speak()`
  // silently fails on some platforms.
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length) {
        voiceRef.current = pickVoice(v);
        setVoicesReady(true);
      }
    };

    load();
    window.speechSynthesis.onvoiceschanged = load;
    window.speechSynthesis.addEventListener?.("voiceschanged", load);

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.removeEventListener?.("voiceschanged", load);
    };
  }, []);

  const speak = useCallback(
    (text: string, opts: { force?: boolean; minGapMs?: number } = {}) => {
      if (!enabled) return;
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      const { force = false, minGapMs = 3_000 } = opts;
      const now = Date.now();
      if (!force && now - lastSpokeRef.current < minGapMs) return;

      // Cancel anything queued — a wedged utterance must not block the
      // next one (this was the "if (speaking) return" bug).
      try {
        window.speechSynthesis.cancel();
      } catch {}

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.95;
      utter.pitch = 1.05;
      utter.volume = 0.9;
      utter.lang = "en-US";
      if (voiceRef.current) utter.voice = voiceRef.current;

      // No-op handlers keep the queue sane on iOS Safari.
      utter.onend = () => {};
      utter.onerror = () => {};

      try {
        window.speechSynthesis.speak(utter);
        lastSpokeRef.current = now;
      } catch (e) {
        console.warn("[voice] speak failed", e);
      }
    },
    [enabled],
  );

  const randomEncouragement = useCallback(
    () =>
      speak(PROMPTS[Math.floor(Math.random() * PROMPTS.length)], {
        minGapMs: 60_000,
      }),
    [speak],
  );

  return { speak, randomEncouragement, voicesReady };
}
