"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const EARTH_RADIUS_M = 6_371_000;
const FIRST_FIX_TIMEOUT_MS = 30_000; // watchdog: no fix in 30s → surface error

const toRad = (deg: number) => (deg * Math.PI) / 180;

function haversine(a: GeolocationCoordinates, b: GeolocationCoordinates) {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
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
  const startedAtRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const activeMsRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMovementRef = useRef<number>(0);
  const firstFixTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stateRef = useRef<TrackerState>("idle");
  const distanceRef = useRef(0);
  const routeRef = useRef<Array<{ lat: number; lng: number; t: number }>>([]);

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

    // Watchdog — Chrome desktop silently retries watchPosition forever when
    // no fix is available. Surface a real error after 30s so the UI can act.
    if (firstFixTimeoutRef.current) clearTimeout(firstFixTimeoutRef.current);
    firstFixTimeoutRef.current = setTimeout(() => {
      if (!lastPosRef.current) {
        setError(
          "GPS signal is weak. Move to an open area, or check that location services are enabled for your browser.",
        );
      }
    }, FIRST_FIX_TIMEOUT_MS);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        // First fix — cancel the watchdog.
        if (firstFixTimeoutRef.current) {
          clearTimeout(firstFixTimeoutRef.current);
          firstFixTimeoutRef.current = null;
        }

        const speed = pos.coords.speed ?? 0;
        setCurrentSpeedMps(speed);
        if (speed > 0.5) lastMovementRef.current = Date.now();

        setCurrentPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });

        if (lastPosRef.current) {
          const d = haversine(lastPosRef.current, pos.coords);
          if (d > 1) {
            setDistanceMeters((prev) => prev + d);
            setRoute((prev) => [
              ...prev,
              {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                t: Date.now(),
              },
            ]);
          }
        } else {
          // First fix → seed the route so the map isn't stuck empty.
          setRoute([
            {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              t: Date.now(),
            },
          ]);
        }
        lastPosRef.current = pos.coords;
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

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device.");
      return false;
    }
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });
      setCurrentPosition({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      return true;
    } catch (err: any) {
      setError(
        err?.code === 1
          ? "Location permission denied. Enable location access and try again."
          : err?.code === 3
            ? "Location request timed out. Move to an open area and try again."
            : "Couldn't access your location. Please try again.",
      );
      return false;
    }
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
    lastPosRef.current = null;
    setElapsedMs(0);
    setDistanceMeters(0);
    setRoute([]);
    setCurrentPosition(null);
    setState("active");
    startWatch();

    tickRef.current = setInterval(() => {
      if (stateRef.current === "active") {
        setElapsedMs((p) => p + 1000);
        if (autoPause && Date.now() - lastMovementRef.current > 5000) {
          pause();
        }
      }
    }, 1000);
  }, [autoPause, pause, startWatch]);

  const resume = useCallback(() => {
    if (stateRef.current !== "paused") return;
    if (pausedAtRef.current) {
      activeMsRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    setState("active");
    startWatch();
  }, [startWatch]);

  // Retry: restart the watch while keeping the same session going.
  // Used by the "Retry GPS" button in the map placeholder.
  const retry = useCallback(() => {
    if (stateRef.current !== "active") return;
    setError(null);
    lastPosRef.current = null;
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

    const snapshot: WorkoutSnapshot = {
      startedAt: startedAtRef.current ?? endedAt,
      endedAt,
      activeMs,
      distanceMeters: distanceRef.current,
      route: routeRef.current,
      activity,
    };

    setState("completed");
    return snapshot;
  }, [activity, clearTimers]);

  useEffect(() => {
    return () => {
      clearTimers();
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
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
    requestPermission,
  };
}
