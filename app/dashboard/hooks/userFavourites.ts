"use client";
import useSWR, { mutate } from "swr";
import { authFetcher } from "@/app/utils/client-auth";

export function useFavorites() {
  const { data, error, isLoading } = useSWR(
    "/api/user/favorites",
    authFetcher,
    {
      dedupingInterval: 120_000, // 2 minutes
      revalidateOnFocus: false,
    },
  );

  return {
    favorites: data?.success ? data.data : [],
    error,
    isLoading,
    mutateFavorites: () => mutate("/api/user/favorites"),
  };
}
