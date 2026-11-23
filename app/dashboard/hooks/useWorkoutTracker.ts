"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const EARTH_RADIUS_M = 6_371_000;
const FIRST_FIX_TIMEOUT_MS = 30_000;
const AUTO_PAUSE_MS = 12_000; // no movement for 12s → pause
const GRACE_AFTER_RESUME_MS = 15_000; // ignore auto-pause for 15s after resume
const MAX_ACCURACY_M = 25; // ignore fixes worse than this for distance
const MIN_MOVE_M = 2.5; // ignore jitter smaller than this
const MIN_MOVE_SPEED = 0.3; // m/s — walking threshold
const MAX_PLAUSIBLE_SPEED = 15; // m/s (54 km/h) — reject GPS jumps

const toRad = (d: number) => (d * Math.PI) / 180;

function haversine(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export type TrackerState = "idle" | "active" | "paused" | "completed";

export interface WorkoutSnapshot {
  startedAt: number;
  endedAt: number;
  activeMs: number;
  distanceMeters: number;
  route: Array<{ lat: number; lng: number; t: number }>;
  activity: string;
  // ── new ──
  maxSpeedMps: number;
  avgSpeedMps: number;
  avgPaceSecPerKm: number | null;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export function useWorkoutTracker({
  autoPause = true,
  activity,
}: {
  autoPause?: boolean;
  activity: string;
}) {
  const [state, setState] = useState<TrackerState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [route, setRoute] = useState<
    Array<{ lat: number; lng: number; t: number }>
  >([]);
  const [currentPosition, setCurrentPosition] = useState<LatLng | null>(null);
  const [currentSpeedMps, setCurrentSpeedMps] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<GeolocationCoordinates | null>(null);
  const lastPosTimeRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const activeMsRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMovementRef = useRef(0);
  const firstFixTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceUntilRef = useRef(0); // resume-grace timestamp
  const maxSpeedRef = useRef(0);

  const stateRef = useRef<TrackerState>("idle");
  const distanceRef = useRef(0);
  const routeRef = useRef<Array<{ lat: number; lng: number; t: number }>>([]);
  const activeMsSnapshotRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    distanceRef.current = distanceMeters;
  }, [distanceMeters]);
  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  const clearTimers = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    if (firstFixTimeoutRef.current) clearTimeout(firstFixTimeoutRef.current);
    firstFixTimeoutRef.current = null;
  }, []);

  const pause = useCallback(() => {
    if (stateRef.current !== "active") return;
    setState("paused");
    pausedAtRef.current = Date.now();
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (firstFixTimeoutRef.current) {
      clearTimeout(firstFixTimeoutRef.current);
      firstFixTimeoutRef.current = null;
    }
  }, []);

  const startWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    lastMovementRef.current = Date.now();
    lastPosRef.current = null;
    lastPosTimeRef.current = null;

    if (firstFixTimeoutRef.current) clearTimeout(firstFixTimeoutRef.current);
    firstFixTimeoutRef.current = setTimeout(() => {
      if (!lastPosRef.current) {
        setError(
          "GPS signal is weak. Move to an open area or check that location services are enabled for your browser.",
        );
      }
    }, FIRST_FIX_TIMEOUT_MS);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (firstFixTimeoutRef.current) {
          clearTimeout(firstFixTimeoutRef.current);
          firstFixTimeoutRef.current = null;
        }

        // Always publish live position so the marker follows the user.
        setCurrentPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });

        // Skip distance math on low-accuracy fixes (typical of jitter).
        const accurate = (pos.coords.accuracy ?? 0) <= MAX_ACCURACY_M;

        if (!lastPosRef.current || !lastPosTimeRef.current) {
          // First fix → seed route
          lastPosRef.current = pos.coords;
          lastPosTimeRef.current = pos.timestamp;
          setRoute([
            {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              t: pos.timestamp,
            },
          ]);
          return;
        }

        const dt = (pos.timestamp - lastPosTimeRef.current) / 1000;
        if (dt <= 0) return;

        const d = haversine(lastPosRef.current, pos.coords);
        const computedSpeed = d / dt;
        const deviceSpeed = pos.coords.speed ?? 0;
        const instantSpeed = deviceSpeed > 0 ? deviceSpeed : computedSpeed;

        // Reject GPS teleports (multipath bounce, first-fix drift).
        if (instantSpeed > MAX_PLAUSIBLE_SPEED) {
          lastPosRef.current = pos.coords;
          lastPosTimeRef.current = pos.timestamp;
          return;
        }

        // Count distance only when the move is credible on all three axes.
        const isRealMove =
          accurate && d >= MIN_MOVE_M && instantSpeed >= MIN_MOVE_SPEED;

        if (isRealMove) {
          setDistanceMeters((prev) => prev + d);
          setRoute((prev) => [
            ...prev,
            {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              t: pos.timestamp,
            },
          ]);
          setCurrentSpeedMps(instantSpeed);
          if (instantSpeed > maxSpeedRef.current)
            maxSpeedRef.current = instantSpeed;
          lastMovementRef.current = Date.now();
        } else {
          setCurrentSpeedMps(0);
        }

        lastPosRef.current = pos.coords;
        lastPosTimeRef.current = pos.timestamp;
      },
      (err) => {
        const msg =
          err.code === 1
            ? "Location permission denied. Enable location access in your browser settings."
            : err.code === 2
              ? "Location unavailable. Check your device GPS."
              : err.code === 3
                ? "Location request timed out. Move to an open area and try again."
                : err.message;
        setError(msg);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 30000 },
    );
  }, []);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device.");
      return;
    }
    setError(null);
    startedAtRef.current = Date.now();
    activeMsRef.current = 0;
    activeMsSnapshotRef.current = 0;
    pausedAtRef.current = null;
    maxSpeedRef.current = 0;
    graceUntilRef.current = 0;
    setElapsedMs(0);
    setDistanceMeters(0);
    setRoute([]);
    setCurrentPosition(null);
    setCurrentSpeedMps(0);
    setState("active");
    startWatch();

    tickRef.current = setInterval(() => {
      if (stateRef.current !== "active") return;
      setElapsedMs((p) => p + 1000);
      if (!autoPause) return;
      if (Date.now() < graceUntilRef.current) return; // grace after resume
      if (Date.now() - lastMovementRef.current > AUTO_PAUSE_MS) pause();
    }, 1000);
  }, [autoPause, pause, startWatch]);

  const resume = useCallback(() => {
    if (stateRef.current !== "paused") return;
    if (pausedAtRef.current) {
      activeMsRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    // Grace period so the tick doesn't instantly re-pause before GPS returns.
    graceUntilRef.current = Date.now() + GRACE_AFTER_RESUME_MS;
    lastMovementRef.current = Date.now();
    setState("active");
    startWatch();
  }, [startWatch]);

  const retry = useCallback(() => {
    if (stateRef.current !== "active") return;
    setError(null);
    lastPosRef.current = null;
    lastPosTimeRef.current = null;
    graceUntilRef.current = Date.now() + GRACE_AFTER_RESUME_MS;
    startWatch();
  }, [startWatch]);

  const stop = useCallback((): WorkoutSnapshot => {
    clearTimers();
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const endedAt = Date.now();
    if (pausedAtRef.current) {
      activeMsRef.current += endedAt - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    const activeMs =
      activeMsRef.current ||
      (startedAtRef.current ? endedAt - startedAtRef.current : 0);

    const distance = distanceRef.current;
    const avgSpeedMps = activeMs > 0 ? distance / (activeMs / 1000) : 0;
    const avgPaceSecPerKm =
      distance > 0 ? activeMs / 1000 / (distance / 1000) : null;

    const snapshot: WorkoutSnapshot = {
      startedAt: startedAtRef.current ?? endedAt,
      endedAt,
      activeMs,
      distanceMeters: distance,
      route: routeRef.current,
      activity,
      maxSpeedMps: maxSpeedRef.current,
      avgSpeedMps,
      avgPaceSecPerKm,
    };

    setState("completed");
    return snapshot;
  }, [activity, clearTimers]);

  useEffect(() => {
    return () => {
      clearTimers();
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [clearTimers]);

  const avgPaceSecPerKm =
    distanceMeters > 0 ? elapsedMs / 1000 / (distanceMeters / 1000) : null;

  return {
    state,
    elapsedMs,
    distanceMeters,
    route,
    currentPosition,
    currentSpeedMps,
    error,
    avgPaceSecPerKm,
    startedAt: startedAtRef.current,
    activeMs: activeMsRef.current,
    start,
    pause,
    resume,
    stop,
    retry,
  };
}
