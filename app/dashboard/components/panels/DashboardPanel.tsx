"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/app/dashboard/hooks/useProfile";
import useSWR from "swr";
import { motion } from "framer-motion";
import {
  Heart,
  Footprints,
  Calendar,
  User,
  Activity,
  ArrowRight,
  Users,
  TrendingUp,
  Pill,
  Clock,
  ChevronRight,
  HeartPulse,
  Settings,
} from "lucide-react";
import { useDashboard, PanelId } from "../../DashboardContext";
import { authFetcher } from "@/app/utils/client-auth";
import AppointmentsModal from "../modals/AppointmentModal";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";

const CardSkeleton = () => (
  <div className="bg-gray-100 rounded-2xl p-5 h-24 animate-pulse" />
);

export default function DashboardPanel() {
  const { user, isLoading: userLoading } = useUser();
  const { setActivePanel } = useDashboard();
  const [showAppointmentsModal, setShowAppointmentsModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpSlide, setHelpSlide] = useState(0);

  useEffect(() => {
    const hasSeenHelp = localStorage.getItem("doza_dashboard_help");
    if (!hasSeenHelp) {
      setShowHelp(true);
      localStorage.setItem("doza_dashboard_help", "true");
    }
  }, []);

  const { data: healthData, isLoading: healthLoading } = useSWR(
    "/api/health-records",
    authFetcher,
  );
  const records = healthData?.success ? healthData.data : [];

  const { data: appointmentsData, isLoading: apptLoading } = useSWR(
    "/api/appointments?status=upcoming",
    authFetcher,
  );
  const appointments = appointmentsData?.success ? appointmentsData.data : [];

  const { data: upcomingMedsData } = useSWR(
    "/api/medications/upcoming",
    authFetcher,
  );
  const upcomingDoses = upcomingMedsData?.success ? upcomingMedsData.data : [];
  const nextDose = upcomingDoses.length > 0 ? upcomingDoses[0] : null;

  const calculateCompleteness = () => {
    if (!user?.profile) return 0;
    const fields = [
      "displayName",
      "phone",
      "dateOfBirth",
      "gender",
      "bloodGroup",
      "height",
      "weight",
    ];
    const filled = fields.filter(
      (f) => user.profile[f as keyof typeof user.profile],
    );
    return Math.round((filled.length / fields.length) * 100);
  };

  const completeness = calculateCompleteness();

  const latestHeartRate = records
    .filter((r: any) => r.type === "heartRate")
    .sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
  const latestSteps = records
    .filter((r: any) => r.type === "steps")
    .sort((a: any, b: any) => b.date.localeCompare(a.date))[0];

  const nextAppointment = appointments
    .filter((a: any) => a.status === "upcoming")
    .sort((a: any, b: any) => a.date.localeCompare(b.date))[0];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const firstName = user?.fullName.split(" ")[0] || "User";

  const isLoading = userLoading || healthLoading || apptLoading;

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-4 space-y-4  min-h-screen">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-4 w-64 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="p-8 text-center">Unable to load user data</div>;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "max-w-6xl mx-auto px-4 pb-28  min-h-screen",
          poppins.className,
        )}
      >
        {/* Simple Greeting (scrolls with page) */}
        <div className="pt-6 pb-2">
          <h1
            className={cn(
              "text-3xl font-bold text-gray-800",
              bebasNeue.className,
            )}
          >
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-sm text-emerald-600 mt-1">
            Your health at a glance
          </p>
        </div>

        {/* Profile Completeness Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-500">Profile completeness</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-24 bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{ width: `${completeness}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 whitespace-nowrap">
                    {completeness}%
                  </span>
                </div>
              </div>
            </div>
            {completeness < 100 && (
              <button
                onClick={() => setActivePanel("profile")}
                className="w-full xs:w-auto px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-full shadow-sm active:bg-emerald-700"
              >
                Complete Profile
              </button>
            )}
          </div>
        </div>

        {/* Medical Shop Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => setActivePanel("doza-medical-shop")}
          className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 shadow-md cursor-pointer active:scale-[0.98] transition-transform"
          style={{ height: 100 }}
        >
          <div className="absolute inset-0 bg-black/10" />
          <div
            className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-20"
            style={{ backgroundImage: "url('/assets/medical/bp_monitor.jpg')" }}
          />
          <div className="relative z-10 h-full flex items-center justify-between px-4 text-white">
            <div className="flex items-center gap-3 min-w-0">
              <HeartPulse className="w-8 h-8 shrink-0" />
              <div className="truncate">
                <h2 className="text-lg font-bold truncate">
                  Doza Medical Shop
                </h2>
                <p className="text-sm text-white/80 truncate">
                  Quality medical equipment
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 shrink-0" />
          </div>
        </motion.div>

        {/* Health Metrics Section */}
        <div className="mb-6">
          <h2
            className={cn(
              "text-xl font-semibold text-gray-800 mb-3",
              bebasNeue.className,
            )}
          >
            Today's Metrics
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-emerald-600 rounded-2xl p-4 text-white shadow-lg"
            >
              <div className="flex items-start justify-between mb-2">
                <Heart className="w-6 h-6" fill="currentColor" />
                <span className="text-xs text-white/70">bpm</span>
              </div>
              <p className="text-2xl font-bold">
                {latestHeartRate ? latestHeartRate.value : "—"}
              </p>
              <p className="text-xs text-white/80 mt-1">Heart Rate</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-emerald-600 rounded-2xl p-4 text-white shadow-lg"
            >
              <div className="flex items-start justify-between mb-2">
                <Footprints className="w-6 h-6" />
                <span className="text-xs text-white/70">steps</span>
              </div>
              <p className="text-2xl font-bold">
                {latestSteps ? latestSteps.value.toLocaleString() : "—"}
              </p>
              <p className="text-xs text-white/80 mt-1">Steps</p>
            </motion.div>
          </div>
        </div>

        {/* Next Appointment Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          onClick={() => setShowAppointmentsModal(true)}
          className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-gray-100 active:bg-gray-50 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <h3
                className={cn(
                  "font-semibold text-gray-800",
                  bebasNeue.className,
                )}
              >
                Next Appointment
              </h3>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
          {nextAppointment ? (
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-lg font-bold text-gray-800 truncate">
                  {nextAppointment.medicName}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(nextAppointment.date).toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric" },
                  )}{" "}
                  at {nextAppointment.time}
                </p>
              </div>
              <span className="self-start xs:self-center px-3 py-1 bg-emerald-100 rounded-full text-emerald-700 text-sm font-medium whitespace-nowrap">
                Upcoming
              </span>
            </div>
          ) : (
            <p className="text-gray-500">No upcoming appointments</p>
          )}
        </motion.div>

        {/* Medications Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-emerald-600" />
              <h3
                className={cn(
                  "font-semibold text-gray-800",
                  bebasNeue.className,
                )}
              >
                Today's Medications
              </h3>
            </div>
            <button
              onClick={() => setActivePanel("medications")}
              className="text-sm text-emerald-600 font-medium flex items-center gap-1"
            >
              Manage <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {nextDose ? (
            <div className="flex flex-col xs:flex-row items-start xs:items-center gap-4 p-3 bg-emerald-50 rounded-xl">
              <div className="p-3 bg-emerald-600 rounded-full text-white shrink-0">
                <Pill className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Next dose</p>
                <p className="font-semibold text-gray-800 truncate">
                  {nextDose.medicationName}
                </p>
                <p className="text-xs text-gray-500">{nextDose.dosage}</p>
              </div>
              <div className="text-left xs:text-right shrink-0">
                <p className="text-xs text-gray-500">Due in</p>
                <p className="text-lg font-bold text-emerald-600">
                  {(() => {
                    const diff =
                      new Date(nextDose.scheduledTime).getTime() - Date.now();
                    if (diff <= 0) return "Now";
                    const hours = Math.floor(diff / 3600000);
                    const mins = Math.floor((diff % 3600000) / 60000);
                    return `${hours}h ${mins}m`;
                  })()}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Pill className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">No medications scheduled</p>
              <button
                onClick={() => setActivePanel("medications")}
                className="mt-2 text-emerald-600 font-medium text-sm"
              >
                Add a medication
              </button>
            </div>
          )}
        </motion.div>

        {/* Quick Access Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-gray-100"
        >
          <h3
            className={cn(
              "font-semibold text-gray-800 mb-3 flex items-center gap-2",
              bebasNeue.className,
            )}
          >
            <Activity className="w-5 h-5 text-emerald-600" />
            Quick Access
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              {
                panel: "health-tracker" as PanelId,
                label: "Tracker",
                icon: Activity,
              },
              {
                panel: "family-friends" as PanelId,
                label: "Family",
                icon: Users,
              },
              { panel: "doza-medics" as PanelId, label: "Medics", icon: Heart },
              {
                action: () => setShowAppointmentsModal(true),
                label: "Appointments",
                icon: Calendar,
              },
              { panel: "profile" as PanelId, label: "Profile", icon: User },
              { panel: "medications" as PanelId, label: "Meds", icon: Pill },
              {
                panel: "doza-medical-shop" as PanelId,
                label: "Shop",
                icon: HeartPulse,
              },
              {
                panel: "settings" as PanelId,
                label: "Settings",
                icon: Settings,
              },
            ].map((item) => {
              const Icon = item.icon;
              if (item.action) {
                return (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl active:bg-emerald-50 min-w-0"
                  >
                    <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] xs:text-xs text-gray-600 truncate w-full text-center">
                      {item.label}
                    </span>
                  </button>
                );
              }
              return (
                <button
                  key={item.panel}
                  onClick={() => setActivePanel(item.panel!)}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl active:bg-emerald-50 min-w-0"
                >
                  <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] xs:text-xs text-gray-600 truncate w-full text-center">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Records Section – Improved UI */}
        {records.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          >
            <h3
              className={cn(
                "font-semibold text-gray-800 mb-3 flex items-center gap-2",
                bebasNeue.className,
              )}
            >
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Recent Records
            </h3>
            <div className="space-y-3">
              {records.slice(0, 5).map((record: any) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-emerald-100 rounded-full text-emerald-700 shadow-sm shrink-0">
                      {record.type === "heartRate" && (
                        <Heart className="w-4 h-4" />
                      )}
                      {record.type === "steps" && (
                        <Footprints className="w-4 h-4" />
                      )}
                      {record.type !== "heartRate" &&
                        record.type !== "steps" && (
                          <Activity className="w-4 h-4" />
                        )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 capitalize text-sm">
                        {record.type}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(record.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-emerald-700">
                      {record.value}
                    </span>
                    <span className="text-xs text-gray-500">
                      {record.unit || ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setActivePanel("health-tracker")}
              className="mt-4 w-full py-3 bg-emerald-50 text-emerald-700 rounded-xl font-medium text-sm flex items-center justify-center gap-2 active:bg-emerald-100"
            >
              View all records <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Appointments Modal */}
      <AppointmentsModal
        isOpen={showAppointmentsModal}
        onClose={() => setShowAppointmentsModal(false)}
      />
    </>
  );
}
