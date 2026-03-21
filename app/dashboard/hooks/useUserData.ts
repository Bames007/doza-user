// app/hooks/useUserData.ts

import useSWR, { mutate } from "swr";
import { authFetcher } from "../../utils/client-auth";

export function useProfile() {
  const { data, error, isLoading } = useSWR("/api/user/profile", authFetcher);
  return {
    profile: data?.data || null,
    isLoading,
    error,
    mutateProfile: () => mutate("/api/user/profile"),
  };
}

export function useSettings() {
  const { data, error, isLoading } = useSWR("/api/user/settings", authFetcher);

  return {
    settings: data?.data || null,
    isLoading,
    error,
    mutateSettings: () => mutate("/api/user/settings"),
  };
}

// Optional: useAppointments hook if needed elsewhere
export function useAppointments(status?: string) {
  const url = status
    ? `/api/appointments?status=${status}`
    : "/api/appointments";
  const { data, error, isLoading } = useSWR(url, authFetcher);

  return {
    appointments: data?.data || [],
    isLoading,
    error,
    mutateAppointments: () => mutate(url),
  };
}

// Optional: useHealthRecords hook
export function useHealthRecords(type?: string, from?: string, to?: string) {
  const params = new URLSearchParams();
  if (type) params.append("type", type);
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  const url = `/api/health-records${params.toString() ? "?" + params.toString() : ""}`;
  const { data, error, isLoading } = useSWR(url, authFetcher);

  return {
    records: data?.data || [],
    isLoading,
    error,
    mutateRecords: () => mutate(url),
  };
}
