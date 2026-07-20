// app/dashboard/hooks/usePendingRequests.ts

import useSWR from "swr";
import { authFetcher } from "@/app/utils/client-auth";

/**
 * Fetch pending link requests for a given userId.
 * @param userId – optional; if not provided, the hook will not fetch.
 */
export function usePendingLinkRequests(userId?: string) {
  const { data, error, mutate } = useSWR(
    userId ? `/api/user/${userId}/pending-requests` : null,
    authFetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 30_000,
      refreshInterval: 60_000,
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
