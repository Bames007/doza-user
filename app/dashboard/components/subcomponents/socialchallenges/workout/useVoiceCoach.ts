"use client";
import { useCallback, useRef } from "react";

const PROMPTS = [
  "You're doing great. Keep pushing.",
  "Stay strong. Every step counts.",
  "You've got this. Keep the pace.",
  "Halfway there. Don't stop now.",
  "Nice work. Keep breathing steady.",
  "You're stronger than you think.",
];

export function useVoiceCoach({ enabled }: { enabled: boolean }) {
  const lastSpokeRef = useRef(0);

  const speak = useCallback(
    (text: string, force = false) => {
      if (!enabled || typeof window === "undefined" || !window.speechSynthesis)
        return;
      const now = Date.now();
      if (!force && now - lastSpokeRef.current < 45_000) return;
      if (window.speechSynthesis.speaking) return;

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.95;
      utter.pitch = 1.05;
      utter.volume = 0.85;

      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => /samantha|google uk english female/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (preferred) utter.voice = preferred;

      window.speechSynthesis.speak(utter);
      lastSpokeRef.current = now;
    },
    [enabled],
  );

  const randomEncouragement = useCallback(
    () => speak(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]),
    [speak],
  );

  return { speak, randomEncouragement };
}
