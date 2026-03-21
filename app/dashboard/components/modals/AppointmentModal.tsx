"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  X,
  XCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import { authFetcher, authDelete } from "@/app/utils/client-auth";

type Appointment = {
  id: string;
  medicId: string;
  medicName: string;
  date: string;
  time: string;
  reason: string;
  status: "upcoming" | "completed" | "cancelled";
  createdAt: string;
};

interface AppointmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AppointmentsModal({
  isOpen,
  onClose,
}: AppointmentsModalProps) {
  const [filter, setFilter] = useState<
    "all" | "upcoming" | "completed" | "cancelled"
  >("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
    "/api/appointments",
    authFetcher,
  );
  const appointments: Appointment[] = data?.success ? data.data : [];

  const filteredAppointments = appointments.filter((apt) => {
    if (filter === "all") return true;
    return apt.status === filter;
  });

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    setCancellingId(id);
    try {
      const result = await authDelete(`/api/appointments/${id}`);
      if (result.success) {
        mutate(); // refresh list
      } else {
        alert("Failed to cancel appointment: " + result.error);
      }
    } catch {
      alert("An error occurred");
    } finally {
      setCancellingId(null);
    }
  };

  const statusColors = {
    upcoming: "text-emerald-600 bg-emerald-50",
    completed: "text-blue-600 bg-blue-50",
    cancelled: "text-red-600 bg-red-50",
  };

  const statusIcons = {
    upcoming: Calendar,
    completed: CheckCircle,
    cancelled: XCircle,
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              My Appointments
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {(["all", "upcoming", "completed", "cancelled"] as const).map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium capitalize transition whitespace-nowrap",
                    filter === f
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  )}
                >
                  {f}
                </button>
              ),
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : error ? (
            <div className="text-center text-red-500 py-8">
              Error loading appointments
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No appointments found.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAppointments.map((apt) => {
                const StatusIcon = statusIcons[apt.status];
                return (
                  <motion.div
                    key={apt.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {apt.medicName}
                          </h3>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full",
                              statusColors[apt.status],
                            )}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {apt.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {apt.reason}
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(apt.date).toLocaleDateString(undefined, {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {apt.time}
                          </span>
                        </div>
                      </div>
                      {apt.status === "upcoming" && (
                        <button
                          onClick={() => handleCancel(apt.id)}
                          disabled={cancellingId === apt.id}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                        >
                          {cancellingId === apt.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          Cancel
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
