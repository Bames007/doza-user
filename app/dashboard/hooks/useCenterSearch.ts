// app/dashboard/hooks/useCenterSearch.ts
import { useEffect, useState } from "react";
import { authFetcher } from "@/app/utils/client-auth";

interface SearchResult {
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
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query || query.trim() === "") {
      setResults([]);
      return;
    }

    if (!userLocation) {
      setError("Location not available");
      return;
    }

    const fetchSearch = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          query: query.trim(),
          type,
          lat: userLocation.lat.toString(),
          lng: userLocation.lng.toString(),
          radius: radius.toString(),
        });
        const url = `/api/centers/search?${params.toString()}`;
        const data = await authFetcher(url);
        if (data.success) {
          setResults(data.data);
        } else {
          setError(data.error || "Search failed");
        }
      } catch (err) {
        setError("Network error");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchSearch, 500);
    return () => clearTimeout(timer);
  }, [query, type, radius, userLocation]);

  return { results, isLoading, error };
}
