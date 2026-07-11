// app/hooks/useUserData.ts
"use client";

import useSWR, { mutate } from "swr";
import { authFetcher } from "../../utils/client-auth";

export function useProfile() {
  const { data, error, isLoading } = useSWR("/api/user/profile", authFetcher, {
    dedupingInterval: 300_000, // 5 minutes
    revalidateOnFocus: false,
  });

  return {
    profile: data?.success ? data.data : null,
    isLoading,
    error,
    mutateProfile: () => mutate("/api/user/profile"),
  };
}
export function useSettings() {
  const { data, error, isLoading } = useSWR("/api/user/settings", authFetcher, {
    dedupingInterval: 300_000, // 5 minutes
    revalidateOnFocus: false,
  });

  return {
    settings: data?.success ? data.data : null,
    isLoading,
    error,
    mutateSettings: () => mutate("/api/user/settings"),
  };
}

export function useAppointments(status?: string) {
  const url = status
    ? `/api/appointments?status=${status}`
    : "/api/appointments";

  const { data, error, isLoading } = useSWR(url, authFetcher, {
    dedupingInterval: 60_000, // 1 minute – appointments change more often
  });

  return {
    appointments: data?.success ? data.data : [],
    isLoading,
    error,
    mutateAppointments: () => mutate(url),
  };
}

export function useHealthRecords(type?: string, from?: string, to?: string) {
  const params = new URLSearchParams();
  if (type) params.append("type", type);
  if (from) params.append("from", from);
  if (to) params.append("to", to);

  const queryString = params.toString();
  const url = `/api/health-records${queryString ? "?" + queryString : ""}`;

  const { data, error, isLoading } = useSWR(url, authFetcher, {
    dedupingInterval: 120_000, // 2 minutes
  });

  return {
    records: data?.success ? data.data : [],
    isLoading,
    error,
    mutateRecords: () => mutate(url),
  };
}
