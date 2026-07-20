// app/dashboard/hooks/useLinkedCenters.ts
import useSWR from "swr";
import { authFetcher } from "@/app/utils/client-auth";

export function useLinkedCenters(userId?: string) {
  const { data, error, mutate } = useSWR(
    userId ? `/api/user/${userId}/linked-centers` : null,
    authFetcher,
    { revalidateOnFocus: true },
  );
  return {
    centers: data?.data || [],
    loading: !data && !error,
    error,
    mutate,
  };
}
