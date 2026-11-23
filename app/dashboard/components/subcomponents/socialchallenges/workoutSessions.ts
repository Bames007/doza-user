interface WorkoutSession {
  id: string;
  uid: string;
  challengeId: string;
  activity: "running" | "cycling" | "walking" | "swimming"; // etc.
  status: "active" | "paused" | "completed";
  startedAt: number; // epoch ms
  endedAt: number | null;
  activeDurationMs: number; // excludes paused time
  distanceMeters: number;
  route: Array<{ lat: number; lng: number; t: number }>;
  metrics: {
    avgPaceSecPerKm: number | null;
    bestPaceSecPerKm: number | null;
    avgSpeedMps: number | null;
    maxSpeedMps: number | null;
    elevationGainMeters: number; // optional, from GPS alt
  };
  pointsEarned: number;
  voiceEnabled: boolean;
}
