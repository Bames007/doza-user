// app/dashboard/hooks/useCenterSearch.ts
import { useState, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";

const publicFetcher = (url: string) => fetch(url).then((res) => res.json());

export interface SearchResult {
  centerId: string;
  centerName: string;
  centerType: string;
  location: { lat: number; lng: number };
  address: string;
  phone: string;
  email: string;
  operatingHours: any;
  distance: number;
  matches: any[];
}

export function useCenterSearch(
  query: string,
  type: "service" | "drug" | "test",
  radius: number,
  userLocation?: { lat: number; lng: number } | null,
) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const previousQueryRef = useRef(query);

  // Only debounce when query actually changes
  useEffect(() => {
    if (previousQueryRef.current === query) return;
    previousQueryRef.current = query;

    const timer = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const searchParams = useMemo(() => {
    if (!userLocation) return null;
    return new URLSearchParams({
      query: debouncedQuery.trim(),
      type,
      lat: userLocation.lat.toString(),
      lng: userLocation.lng.toString(),
      radius: radius.toString(),
    }).toString();
  }, [debouncedQuery, type, radius, userLocation]);

  // Always fetch when location is available (shows all nearby on load)
  const url = userLocation ? `/api/centers/search?${searchParams}` : null;

  const { data, error, isLoading, mutate } = useSWR(url, publicFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    keepPreviousData: true, // Keep old data while loading new
  });

  return {
    results: (data?.success ? data.data : []) as SearchResult[],
    isLoading,
    error: error
      ? "Network error"
      : data?.success === false
        ? data.error
        : null,
    refetch: () => mutate(),
  };
}
