// app/dashboard/hooks/usePrescribedMedications.ts

import { useState, useEffect } from "react";
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

export function usePrescribedMedications() {
  const user = useUserContext();
  const { centers, loading: centersLoading } = useLinkedCenters(user?.id);
  const [prescriptions, setPrescriptions] = useState<PrescribedMedication[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!centers.length || !user?.id) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      const allRx: PrescribedMedication[] = [];

      for (const center of centers) {
        try {
          const res = await fetch(
            `/api/centers/${center.centerId}/patients/${user.id}`,
            { credentials: "include" },
          );
          if (!res.ok) continue;
          const data = await res.json();
          if (!data.success || !data.data?.prescriptions) continue;

          const rxList = data.data.prescriptions.map(
            (rx: any, idx: number) => ({
              id: `${center.centerId}-${idx}`,
              centerId: center.centerId,
              centerName: center.centerName,
              medication: rx.medication || "Unknown",
              dosage: rx.dosage || "",
              frequency: rx.frequency || "",
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
            }),
          );
          allRx.push(...rxList);
        } catch (e) {
          console.warn(
            `Failed to fetch prescriptions for center ${center.centerId}`,
            e,
          );
        }
      }

      setPrescriptions(allRx);
      setLoading(false);
    };

    fetchAll();
  }, [centers, user?.id]);

  return { prescriptions, loading, error };
}
