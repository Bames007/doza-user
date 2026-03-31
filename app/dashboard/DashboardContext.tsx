"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type PanelId =
  | "dashboard"
  | "health-tracker"
  | "medications"
  | "challenges"
  | "family-friends"
  | "doza-medics"
  | "doza-map"
  | "profile"
  | "settings"
  | "help"
  | "doza-sport-shop"
  | "doza-medical-shop"
  | "appointment"
  | "notifications";

interface DashboardContextType {
  activePanel: PanelId;
  setActivePanel: (panel: PanelId) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined,
);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [activePanel, setActivePanel] = useState<PanelId>("dashboard");
  return (
    <DashboardContext.Provider value={{ activePanel, setActivePanel }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
