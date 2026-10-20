import { useState, useEffect } from "react";

// Module-level cache — prevents loading flash on panel remount
let cachedLocation: { lat: number; lng: number } | null = null;
let watcherActive = false;

export const useUserLocation = () => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    () => cachedLocation,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !cachedLocation);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation not supported");
      setLoading(false);
      return;
    }

    // If another instance already has a watcher active, don't duplicate it.
    // Each hook instance still gets its own `onValue`-style updates via
    // the watcher — but we prevent multiplying permission prompts.
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        cachedLocation = next;
        setLocation(next);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { location, error, loading };
};
