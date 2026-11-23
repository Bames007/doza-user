export function getMET(
  activity: string,
  avgPaceSecPerKm?: number | null,
  avgSpeedKmh?: number | null,
): number {
  if (activity === "walking") return 3.5;
  if (activity === "running" || activity === "jogging") {
    return 8 + (avgPaceSecPerKm && avgPaceSecPerKm < 360 ? 2 : 0);
  }
  if (activity === "cycling") {
    return 6 + (avgSpeedKmh && avgSpeedKmh > 20 ? 2 : 0);
  }
  if (activity === "swimming") return 7;
  if (["pushups", "situps", "squats", "pullups"].includes(activity)) return 5;
  return 5;
}

export function computeScore({
  activity,
  activeMinutes,
  avgPaceSecPerKm,
  avgSpeedKmh,
}: {
  activity: string;
  activeMinutes: number;
  avgPaceSecPerKm?: number | null;
  avgSpeedKmh?: number | null;
}): { points: number; met: number } {
  const met = getMET(activity, avgPaceSecPerKm, avgSpeedKmh);
  return {
    points: Math.max(0, Math.floor(activeMinutes * met)),
    met,
  };
}
