"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const EARTH_RADIUS_M = 6_371_000;
const FIRST_FIX_TIMEOUT_MS = 30_000;
const AUTO_PAUSE_MS = 12_000;
const GRACE_AFTER_RESUME_MS = 15_000;

// Distance/accuracy tuning for human running/cycling/jogging.
const MAX_ACCURACY_M = 50; // reject fixes worse than this
const MIN_MOVE_M = 4; // ignore sub-4m jitter between accepted fixes
const MAX_PLAUSIBLE_SPEED = 15; // m/s — reject GPS teleports

const toRad = (d: number) => (d * Math.PI) / 180;

type LastPos = { lat: number; lng: number; accuracy: number; t: number };

function haversine(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
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
  maxSpeedMps: number;
  minSpeedMps: number;
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
  const [accuracyM, setAccuracyM] = useState<number | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<LastPos | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const activeMsRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMovementRef = useRef(0);
  const firstFixTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceUntilRef = useRef(0);
  const maxSpeedRef = useRef(0);
  const minSpeedRef = useRef<number>(Infinity);

  const stateRef = useRef<TrackerState>("idle");
  const distanceRef = useRef(0);
  const routeRef = useRef<Array<{ lat: number; lng: number; t: number }>>([]);
  const currentPosRef = useRef<LatLng | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    distanceRef.current = distanceMeters;
  }, [distanceMeters]);
  useEffect(() => {
    routeRef.current = route;
  }, [route]);
  useEffect(() => {
    currentPosRef.current = currentPosition;
  }, [currentPosition]);

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

  // resetPosition: true → treat next fix as first fix (used only when starting fresh).
  // On resume/retry we keep lastPos so continuity is preserved, then guard the
  // "first fix wipes route" path with a length check.
  const startWatch = useCallback((resetPosition: boolean) => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    lastMovementRef.current = Date.now();
    if (resetPosition) {
      lastPosRef.current = null;
    }

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

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const t = pos.timestamp;
        const accuracy = pos.coords.accuracy ?? 999;
        setAccuracyM(accuracy);

        // Always publish current position for the live marker.
        setCurrentPosition({ lat, lng });

        // First fix ever (or after explicit reset) — seed route, don't accumulate.
        if (!lastPosRef.current) {
          lastPosRef.current = { lat, lng, accuracy, t };
          setRoute((prev) => (prev.length > 0 ? prev : [{ lat, lng, t }]));
          return;
        }

        const dt = (t - lastPosRef.current.t) / 1000;
        if (dt <= 0) return;

        const d = haversine(lastPosRef.current, { lat, lng });
        const impliedSpeed = d / dt;

        // Reject teleports (multipath bounce, resume-with-stale-position).
        if (impliedSpeed > MAX_PLAUSIBLE_SPEED) {
          // Resync lastPos to current so we recover next fix.
          lastPosRef.current = { lat, lng, accuracy, t };
          return;
        }

        const deviceSpeed = pos.coords.speed ?? 0;
        const instantSpeed = deviceSpeed > 0 ? deviceSpeed : impliedSpeed;

        // Accept only meaningful moves on reasonable accuracy.
        const accept = accuracy <= MAX_ACCURACY_M && d >= MIN_MOVE_M;

        if (accept) {
          setDistanceMeters((prev) => prev + d);
          setRoute((prev) => [...prev, { lat, lng, t }]);
          setCurrentSpeedMps(instantSpeed);
          if (instantSpeed > maxSpeedRef.current)
            maxSpeedRef.current = instantSpeed;
          if (instantSpeed > 0.1 && instantSpeed < minSpeedRef.current) {
            minSpeedRef.current = instantSpeed;
          }
          lastMovementRef.current = Date.now();
          // Only advance lastPos on accept → jitter accumulates nothing.
          lastPosRef.current = { lat, lng, accuracy, t };
        } else {
          // Don't move lastPos — let the next fix build up distance from here.
          setCurrentSpeedMps(deviceSpeed > 0 ? deviceSpeed : 0);
        }
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

  // Seed a position before the user taps Start (map shows instantly).
  const seedPosition = useCallback((pos: LatLng) => {
    if (stateRef.current !== "idle") return;
    setCurrentPosition(pos);
    setError(null);
  }, []);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device.");
      return;
    }
    setError(null);
    startedAtRef.current = Date.now();
    activeMsRef.current = 0;
    pausedAtRef.current = null;
    maxSpeedRef.current = 0;
    minSpeedRef.current = Infinity;
    graceUntilRef.current = 0;
    setElapsedMs(0);
    setDistanceMeters(0);
    setCurrentSpeedMps(0);

    // Seed route + lastPos from currentPosition if available.
    const seed = currentPosRef.current;
    if (seed) {
      setRoute([{ lat: seed.lat, lng: seed.lng, t: Date.now() }]);
      lastPosRef.current = {
        lat: seed.lat,
        lng: seed.lng,
        accuracy: 0,
        t: Date.now(),
      };
    } else {
      setRoute([]);
      lastPosRef.current = null;
    }

    setState("active");
    startWatch(false); // don't reset — we just seeded

    tickRef.current = setInterval(() => {
      if (stateRef.current !== "active") return;
      setElapsedMs((p) => p + 1000);
      if (!autoPause) return;
      if (Date.now() < graceUntilRef.current) return;
      if (Date.now() - lastMovementRef.current > AUTO_PAUSE_MS) pause();
    }, 1000);
  }, [autoPause, pause, startWatch]);

  const resume = useCallback(() => {
    if (stateRef.current !== "paused") return;
    if (pausedAtRef.current) {
      activeMsRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    graceUntilRef.current = Date.now() + GRACE_AFTER_RESUME_MS;
    lastMovementRef.current = Date.now();
    setError(null);
    setState("active");
    // Preserve lastPos across resume → no phantom jump / no route wipe.
    startWatch(false);
  }, [startWatch]);

  const retry = useCallback(() => {
    if (stateRef.current !== "active") return;
    setError(null);
    graceUntilRef.current = Date.now() + GRACE_AFTER_RESUME_MS;
    lastMovementRef.current = Date.now();
    startWatch(true); // resync on retry — a genuine fresh start
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
      minSpeedMps: minSpeedRef.current === Infinity ? 0 : minSpeedRef.current,
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
    accuracyM,
    avgPaceSecPerKm,
    startedAt: startedAtRef.current,
    activeMs: activeMsRef.current,
    start,
    pause,
    resume,
    stop,
    retry,
    seedPosition,
  };
}
