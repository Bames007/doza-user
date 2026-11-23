"use client";
import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  useMap,
} from "react-leaflet";
import { Loader2, MapPin, RefreshCw, AlertTriangle } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

function FollowPosition({ position }: { position?: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!position) return;
    if (position[0] === 0 && position[1] === 0) return;
    const c = map.getCenter();
    const delta = Math.abs(c.lat - position[0]) + Math.abs(c.lng - position[1]);
    if (delta > 0.0005) {
      map.panTo(position, { animate: true, duration: 0.5 });
    }
  }, [position, map]);
  return null;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", onResize);
    };
  }, [map]);
  return null;
}

export function WorkoutMap({
  route,
  current,
  trackingState,
  error,
  onRetry,
}: {
  route: Array<{ lat: number; lng: number }>;
  current?: { lat: number; lng: number };
  trackingState?: "idle" | "active" | "paused" | "completed";
  error?: string | null;
  onRetry?: () => void;
}) {
  const points: [number, number][] = route.map((p) => [p.lat, p.lng]);
  const lastPoint: [number, number] | null =
    points.length > 0 ? points[points.length - 1] : null;
  const currentTuple: [number, number] | null = current
    ? [current.lat, current.lng]
    : lastPoint;

  if (!currentTuple) {
    // ── 1. Error — the tracker gave up or was rejected ──
    if (error) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-slate-100 px-6">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>
          <p className="text-sm font-bold text-slate-800 text-center">
            GPS signal unavailable
          </p>
          <p className="text-xs text-slate-500 text-center max-w-xs">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry GPS
            </button>
          )}
        </div>
      );
    }

    // ── 2. Not started yet — clear "tap Start" message ──
    if (!trackingState || trackingState === "idle") {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-slate-100 px-6">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-slate-800">Ready when you are</p>
          <p className="text-xs text-slate-500 text-center max-w-xs">
            Tap <b>Start</b> below to begin tracking your route.
          </p>
        </div>
      );
    }

    // ── 3. Active/paused but no fix yet — the "waiting" state ──
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-slate-100 px-6">
        <div className="relative">
          <MapPin className="w-8 h-8 text-emerald-600" />
          <Loader2 className="w-4 h-4 text-emerald-600 animate-spin absolute -bottom-1 -right-1" />
        </div>
        <p className="text-xs font-semibold text-slate-600">
          Acquiring GPS fix…
        </p>
        <p className="text-[10px] text-slate-400 text-center max-w-xs">
          Move to an open area and keep the app in the foreground. If this
          hangs, tap Retry.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-[10px] font-bold hover:bg-slate-300 active:scale-95 transition-all"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <MapContainer
      center={currentTuple}
      zoom={16}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
      preferCanvas
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.length > 1 && (
        <Polyline
          positions={points}
          pathOptions={{ color: "#10b981", weight: 4 }}
        />
      )}
      <Marker position={currentTuple} />
      <FollowPosition position={currentTuple} />
      <MapResizer />
    </MapContainer>
  );
}
