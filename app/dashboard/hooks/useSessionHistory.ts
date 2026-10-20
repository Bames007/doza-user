// app/dashboard/hooks/useSessionHistory.ts
import useSWR from "swr";
import { authFetcher } from "@/app/utils/client-auth";

export function useSessionHistory(userId?: string) {
  const { data, error, mutate, isLoading } = useSWR(
    userId ? `/api/user/${userId}/sessions` : null,
    authFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000,
      keepPreviousData: true,
      revalidateIfStale: false,
    },
  );

  // Cold start only: no data, no error, still loading
  const loading = isLoading && !data && !error;

  return {
    sessions: data?.data || [],
    loading,
    error,
    mutate,
  };
}
