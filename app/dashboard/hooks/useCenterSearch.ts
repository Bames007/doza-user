import { useState, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { useUser } from "./useProfile"; // ✅ Changed to useProfile

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

const createFetcher = (userId: string) => (url: string) =>
  fetch(url, { headers: { "x-user-id": userId } }).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });

export function useCenterSearch(
  query: string,
  type: "service" | "drug" | "test",
  radius: number,
  userLocation?: { lat: number; lng: number } | null,
) {
  // ✅ Use useUser to reliably get the current user ID
  const { user } = useUser();
  const userId = user?.id;

  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const previousQueryRef = useRef(query);

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

  const url = userLocation ? `/api/centers/search?${searchParams}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    userId && url ? [url, userId] : null,
    ([url, uid]: [string, string]) => createFetcher(uid)(url),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
      keepPreviousData: true,
    },
  );

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
