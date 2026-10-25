// app/dashboard/hooks/usePrescribedMedications.ts

import { useMemo } from "react";
import useSWR from "swr";
import { useLinkedCenters } from "./useLinkedCenters";
import { useUserContext } from "../UserContext";

export interface PrescribedMedication {
  durationDays: any;
  quantityPerDose: number;
  id: string;
  centerId: string;
  centerName: string;
  medication: string;
  dosage: string;
  frequency: string;
  times: string[]; // NEW — passed through so custom works
  route: string;
  duration: string;
  instructions?: string;
  prescribedBy: string;
  prescribedAt: string;
  dispensed: boolean;
  dispensedStatus?: string;
  status: "active" | "completed" | "paused";
  source: "hospital" | "external";
  totalQuantity: number;
  dispensedTotal: number;
}

interface LinkedCenter {
  centerId: string;
  centerName: string;
}

export function usePrescribedMedications() {
  const user = useUserContext();
  const { centers, loading: centersLoading } = useLinkedCenters(user?.id);

  const typedCenters = useMemo<LinkedCenter[]>(() => {
    if (!Array.isArray(centers)) return [];
    return centers as LinkedCenter[];
  }, [centers]);

  const centerKey = useMemo(
    () =>
      typedCenters
        .map((c) => c.centerId)
        .sort()
        .join(","),
    [typedCenters],
  );

  const { data, isLoading, error } = useSWR<PrescribedMedication[]>(
    user?.id && typedCenters.length > 0
      ? ["prescribed-medications", user.id, centerKey]
      : null,
    async () => {
      if (!user?.id) return [];

      const results = await Promise.all(
        typedCenters.map(async (center): Promise<PrescribedMedication[]> => {
          try {
            const res = await fetch(
              `/api/centers/${center.centerId}/patients/${user.id}`,
              { credentials: "include" },
            );
            if (!res.ok) return [];
            const data = await res.json();
            if (!data.success || !data.data?.prescriptions) return [];

            return data.data.prescriptions.map((rx: any, idx: number) => ({
              id: `${center.centerId}-${idx}`,
              centerId: center.centerId,
              centerName: center.centerName,
              medication: rx.medication || "Unknown",
              dosage: rx.dosage || "",
              frequency: rx.frequency || "",
              // NEW — pass through custom times if the doctor provided them
              times: Array.isArray(rx.times) ? rx.times : [],
              route: rx.route || "",
              duration: rx.duration || "",
              instructions: rx.instructions || "",
              prescribedBy: rx.prescribedBy || "Doctor",
              prescribedAt: rx.prescribedAt || new Date().toISOString(),
              dispensed: rx.dispensed || false,
              dispensedStatus: rx.dispensedStatus || "none",
              status: rx.dispensed ? "completed" : "active",
              source: rx.source || "hospital",
              totalQuantity: rx.totalQuantity || 1,
              dispensedTotal: rx.dispensedTotal || 0,
            })) as PrescribedMedication[];
          } catch (e) {
            console.warn(
              `Failed to fetch prescriptions for center ${center.centerId}`,
              e,
            );
            return [];
          }
        }),
      );

      return results.flat();
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000,
      keepPreviousData: true,
      revalidateIfStale: false,
    },
  );

  return {
    prescriptions: data ?? [],
    loading: isLoading,
    error: error ?? null,
  };
}
