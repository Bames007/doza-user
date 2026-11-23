"use client";
import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

function FollowPosition({ position }: { position?: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, map.getZoom());
  }, [position, map]);
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
  const center: [number, number] = current
    ? [current.lat, current.lng]
    : points[points.length - 1] || [0, 0];

  return (
    <MapContainer
      center={center}
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
      {current && <Marker position={[current.lat, current.lng]} />}
      <FollowPosition position={center} />
    </MapContainer>
  );
}
