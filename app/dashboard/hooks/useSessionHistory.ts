// app/dashboard/hooks/useSessionHistory.ts
import useSWR from "swr";
import { authFetcher } from "@/app/utils/client-auth";

export function useSessionHistory(userId?: string) {
  const { data, error, mutate } = useSWR(
    userId ? `/api/user/${userId}/sessions` : null,
    authFetcher,
    { revalidateOnFocus: true },
  );
  return {
    sessions: data?.data || [],
    loading: !data && !error,
    error,
    mutate,
  };
}
