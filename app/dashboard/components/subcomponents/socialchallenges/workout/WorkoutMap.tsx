"use client";
import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  useMap,
} from "react-leaflet";
import { Loader2, MapPin } from "lucide-react";
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
}: {
  route: Array<{ lat: number; lng: number }>;
  current?: { lat: number; lng: number };
}) {
  const points: [number, number][] = route.map((p) => [p.lat, p.lng]);

  // ── Single, normalized shape: [number, number] | null ──
  const lastPoint: [number, number] | null =
    points.length > 0 ? points[points.length - 1] : null;

  const currentTuple: [number, number] | null = current
    ? [current.lat, current.lng]
    : lastPoint;

  // No fix yet → don't mount Leaflet at all (avoids ocean at [0,0])
  if (!currentTuple) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-slate-100">
        <div className="relative">
          <MapPin className="w-8 h-8 text-emerald-600" />
          <Loader2 className="w-4 h-4 text-emerald-600 animate-spin absolute -bottom-1 -right-1" />
        </div>
        <p className="text-xs font-semibold text-slate-600">
          Waiting for GPS signal…
        </p>
        <p className="text-[10px] text-slate-400 text-center px-6">
          Move to an open area and keep the app in the foreground
        </p>
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
