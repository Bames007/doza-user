// app/dashboard/hooks/usePendingLinkRequests.ts

import useSWR from "swr";
import { authFetcher } from "@/app/utils/client-auth";

export function usePendingLinkRequests(userId?: string) {
  const { data, error, mutate } = useSWR(
    userId ? `/api/user/${userId}/pending-requests` : null,
    authFetcher,
    {
      revalidateOnFocus: false, // ← was true; redundant with refreshInterval
      revalidateOnReconnect: true,
      dedupingInterval: 60_000,
      refreshInterval: 60_000, // ← keeps OTP freshness without focus storms
      keepPreviousData: true,
      // NOTE: deliberately NOT setting revalidateIfStale: false —
      //       we want a refetch on mount so users see current OTP state.
    },
  );

  const pendingRequests = data?.data || [];

  return {
    pendingRequests,
    loading: !data && !error,
    error,
    mutate,
  };
}
