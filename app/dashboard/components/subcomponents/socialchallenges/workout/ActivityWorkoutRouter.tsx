"use client";
import { LiveWorkoutPanel } from "../LiveWorkoutPanel";
import { RepWorkoutPanel } from "./RepWorkoutPanel";
import { getTrackerConfig } from "./activityTrackerConfig";
import type { WorkoutSnapshot } from "@/app/dashboard/hooks/useWorkoutTracker";

export function ActivityWorkoutRouter({
  activity,
  challengeName,
  voiceEnabled,
  onToggleVoice,
  initialPosition,
  onStop,
}: {
  activity: string;
  challengeName: string;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  initialPosition?: { lat: number; lng: number } | null;
  onStop: (session: WorkoutSnapshot) => void;
}) {
  const config = getTrackerConfig(activity);
  if (config.kind === "gps") {
    return (
      <LiveWorkoutPanel
        activity={activity}
        challengeName={challengeName}
        voiceEnabled={voiceEnabled}
        onToggleVoice={onToggleVoice}
        initialPosition={initialPosition}
        onStop={onStop}
      />
    );
  }
  return (
    <RepWorkoutPanel
      activity={activity}
      challengeName={challengeName}
      voiceEnabled={voiceEnabled}
      onToggleVoice={onToggleVoice}
      onStop={onStop}
    />
  );
}
