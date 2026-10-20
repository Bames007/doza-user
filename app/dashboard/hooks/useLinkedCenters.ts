// app/dashboard/hooks/useLinkedCenters.ts
import useSWR from "swr";
import { authFetcher } from "@/app/utils/client-auth";

export function useLinkedCenters(userId?: string) {
  const { data, error, mutate, isLoading } = useSWR(
    userId ? `/api/user/${userId}/linked-centers` : null,
    authFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000,
      keepPreviousData: true,
      revalidateIfStale: false,
    },
  );

  const loading = isLoading && !data && !error;

  return {
    centers: data?.data || [],
    loading,
    error,
    mutate,
  };
}
