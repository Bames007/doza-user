import useSWR from "swr";
import { useUserLocation } from "./useUserLocation";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const useCenterSearch = (
  query: string,
  type: "service" | "drug" | "test",
  maxDistance?: number,
) => {
  const { location } = useUserLocation();

  const { data, error, isLoading } = useSWR(
    location && query.length >= 2
      ? `/api/centers/search?q=${encodeURIComponent(query)}&type=${type}&lat=${location.lat}&lng=${location.lng}&maxDistance=${maxDistance || 50}`
      : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  return {
    results: data?.success ? data.data : [],
    isLoading,
    error: error || (data?.success === false ? data.error : null),
  };
};
