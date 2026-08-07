"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";

interface Props {
  role?: string | null;
  phase: "closing" | "opening";
  onAnimationComplete?: () => void;
}

const Bubble = ({
  left,
  size,
  delay,
}: {
  left: number;
  size: number;
  delay: number;
}) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: -80, opacity: [0, 0.4, 0] }}
    transition={{ duration: 1.5, delay, repeat: Infinity, ease: "linear" }}
    className="absolute bottom-0 rounded-full bg-white/40"
    style={{ left: `${left}%`, width: size, height: size }}
  />
);

export default function BubbleTransition({
  phase,
  onAnimationComplete,
}: Props) {
  const [bubbles, setBubbles] = useState<
    { left: number; size: number; delay: number }[]
  >([]);
  const [hasCompleted, setHasCompleted] = useState(false);

  // 🔁 Reset the completion flag every time the phase changes
  useEffect(() => {
    setHasCompleted(false);
  }, [phase]);

  useEffect(() => {
    const generated = Array.from({ length: 60 }, (_, i) => ({
      left: 2 + Math.random() * 96,
      size: 1 + Math.random() * 3,
      delay: i * 0.03,
    }));
    setBubbles(generated);
  }, []);

  const handleComplete = useCallback(() => {
    if (!hasCompleted && onAnimationComplete) {
      onAnimationComplete();
      setHasCompleted(true);
    }
  }, [hasCompleted, onAnimationComplete]);

  const leftTarget = phase === "closing" ? 0 : "-100%";
  const rightTarget = phase === "closing" ? 0 : "100%";

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-slate-50"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Left panel (green) */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: leftTarget }}
        transition={{ duration: 3, ease: [0.16, 1, 0.3, 1] }}
        onAnimationComplete={handleComplete}
        className="w-1/2 h-full bg-[#2AB04A] bg-[radial-gradient(circle_at_top_right,_#44C864,_#2AB04A)] flex items-center justify-end"
      >
        <div className="relative h-20 w-[160px] bg-[#1a662d] rounded-l-full overflow-hidden flex items-center justify-end pr-6">
          <span className="font-['Bebas_Neue'] text-4xl text-white tracking-widest z-10">
            DO
          </span>
          {bubbles.map((b, i) => (
            <Bubble key={i} left={b.left} size={b.size} delay={b.delay} />
          ))}
        </div>
      </motion.div>

      {/* Right panel (blue) */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: rightTarget }}
        transition={{ duration: 3, ease: [0.16, 1, 0.3, 1] }}
        className="w-1/2 h-full bg-[#2E98ED] bg-[radial-gradient(circle_at_top_left,_#4AA9F2,_#2E98ED)] flex items-center justify-start"
      >
        <div className="relative h-20 w-[160px] bg-[#1e66a0] rounded-r-full overflow-hidden flex items-center justify-start pl-6">
          <span className="font-['Bebas_Neue'] text-4xl text-white tracking-widest z-10">
            ZA
          </span>
          {bubbles.map((b, i) => (
            <Bubble key={i} left={b.left} size={b.size} delay={b.delay} />
          ))}
        </div>
      </motion.div>

      {/* Loading text – only during closing */}
      {phase === "closing" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-16 w-full text-center text-white/40 text-[10px] font-mono tracking-[0.4em] uppercase font-['Poppins']"
        >
          Your Personal Medical Assistant
        </motion.div>
      )}
    </motion.div>
  );
}
