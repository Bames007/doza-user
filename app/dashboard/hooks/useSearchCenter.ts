import useSWR from "swr";
import { useUserLocation } from "./useUserLocation";

const publicFetcher = (url: string) => fetch(url).then((r) => r.json());

export const useCenterSearch = (
  query: string,
  type: "service" | "drug" | "test",
  maxDistanceKm?: number,
) => {
  const { location } = useUserLocation();
  const radius = maxDistanceKm ?? 50;

  const params = new URLSearchParams({
    query,
    type,
    lat: location?.lat.toString() ?? "",
    lng: location?.lng.toString() ?? "",
    radius: radius.toString(),
  });

  const url =
    location && query.length >= 2 ? `/api/search?${params.toString()}` : null;

  const { data, error, isLoading } = useSWR(url, publicFetcher, {
    dedupingInterval: 30_000, // 30 seconds – searches can be refetched quickly
    revalidateOnFocus: false,
  });

  return {
    results: data?.success ? data.data : [],
    isLoading,
    error: error || (data?.success === false ? data.error : null),
  };
};
