import {
  Footprints,
  Bike,
  Waves,
  Dumbbell,
  Activity as ActivityIcon,
  Trophy,
  type LucideIcon,
} from "lucide-react";
// import type { ComponentType } from "react";

export type TrackerKind = "gps" | "reps";

export interface ActivityTrackerConfig {
  kind: TrackerKind;
  //   icon: ComponentType<{ className?: string }>;
  icon: LucideIcon;

  gradient: string; // tailwind "from-X to-Y"
  accent: string; // accent text colour e.g. "text-emerald-400"
  label: string; // "Run", "Push-up"
  muscleGroup?: string;
  defaultIncrement?: number;
  repLabel?: string;
}

export const GPS_ACTIVITIES = [
  "running",
  "jogging",
  "walking",
  "cycling",
  "swimming",
] as const;

export const REP_ACTIVITIES = [
  "pushups",
  "sitps",
  "situps",
  "squats",
  "pullups",
] as const;

export const ACTIVITY_TRACKER_CONFIG: Record<string, ActivityTrackerConfig> = {
  running: {
    kind: "gps",
    icon: Footprints,
    gradient: "from-emerald-500 to-teal-500",
    accent: "text-emerald-400",
    label: "Run",
  },
  jogging: {
    kind: "gps",
    icon: Footprints,
    gradient: "from-teal-500 to-cyan-500",
    accent: "text-teal-400",
    label: "Jog",
  },
  walking: {
    kind: "gps",
    icon: Footprints,
    gradient: "from-sky-500 to-blue-500",
    accent: "text-sky-400",
    label: "Walk",
  },
  cycling: {
    kind: "gps",
    icon: Bike,
    gradient: "from-amber-500 to-orange-500",
    accent: "text-amber-400",
    label: "Ride",
  },
  swimming: {
    kind: "gps",
    icon: Waves,
    gradient: "from-cyan-500 to-blue-600",
    accent: "text-cyan-400",
    label: "Swim",
  },
  pushups: {
    kind: "reps",
    icon: Dumbbell,
    gradient: "from-violet-500 to-purple-600",
    accent: "text-violet-400",
    label: "Push-up",
    muscleGroup: "Chest · Arms · Core",
    defaultIncrement: 5,
    repLabel: "reps",
  },
  sitps: {
    kind: "reps",
    icon: ActivityIcon,
    gradient: "from-rose-500 to-pink-600",
    accent: "text-rose-400",
    label: "Sit-up",
    muscleGroup: "Core · Abs",
    defaultIncrement: 5,
    repLabel: "reps",
  },
  situps: {
    kind: "reps",
    icon: ActivityIcon,
    gradient: "from-rose-500 to-pink-600",
    accent: "text-rose-400",
    label: "Sit-up",
    muscleGroup: "Core · Abs",
    defaultIncrement: 5,
    repLabel: "reps",
  },
  squats: {
    kind: "reps",
    icon: Dumbbell,
    gradient: "from-amber-500 to-yellow-500",
    accent: "text-amber-400",
    label: "Squat",
    muscleGroup: "Legs · Glutes",
    defaultIncrement: 5,
    repLabel: "reps",
  },
  pullups: {
    kind: "reps",
    icon: Dumbbell,
    gradient: "from-indigo-500 to-blue-600",
    accent: "text-indigo-400",
    label: "Pull-up",
    muscleGroup: "Back · Biceps",
    defaultIncrement: 1,
    repLabel: "reps",
  },
};

export function getTrackerConfig(activity: string): ActivityTrackerConfig {
  return (
    ACTIVITY_TRACKER_CONFIG[activity?.toLowerCase?.() ?? ""] ?? {
      kind: "reps",
      icon: Trophy,
      gradient: "from-emerald-500 to-teal-500",
      accent: "text-emerald-400",
      label: activity || "Workout",
      defaultIncrement: 1,
      repLabel: "reps",
    }
  );
}

export const isGpsActivity = (a: string) =>
  (GPS_ACTIVITIES as readonly string[]).includes(a);
export const isRepActivity = (a: string) =>
  (REP_ACTIVITIES as readonly string[]).includes(a);
