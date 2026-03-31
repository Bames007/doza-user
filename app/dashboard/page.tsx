"use client";

import { useDashboard } from "./DashboardContext";
import DashboardPanel from "./components/panels/DashboardPanel";
import HealthTrackerPanel from "./components/panels/HealthTrackerPanel";
import FamilyPanel from "./components/panels/FamilyPanel";
import DozaMedicsPanel from "./components/panels/DozaMedicPanel";
import DozaMapPanel from "./components/panels/DozaMapPanel";
import ProfilePanel from "./components/panels/ProfilePanel";
import SettingsPanel from "./components/panels/SettingsPanel";
import HelpPanel from "./components/panels/HelpPanel";
import NotificationsPanel from "./components/panels/NotificationPanels";
import MedicationPanel from "./components/panels/MedicationPanel";
import SocialChallengesPanel from "./components/panels/SocialChallengePanel";
import DozaSportShopPanel from "./components/panels/DozaSportShopPanel";
import DozaMedicalShopPanel from "./components/panels/DozaMedicalShopPanel";
import AppointmentsPanel from "./components/panels/AppointmentPanel";

export default function DashboardPage() {
  const { activePanel } = useDashboard();

  const renderPanel = () => {
    switch (activePanel) {
      case "dashboard":
        return <DashboardPanel />;
      case "health-tracker":
        return <HealthTrackerPanel />;
      case "medications":
        return <MedicationPanel />;
      case "challenges":
        return <SocialChallengesPanel />;
      case "family-friends":
        return <FamilyPanel />;
      case "doza-sport-shop":
        return <DozaSportShopPanel />;
      case "doza-medical-shop":
        return <DozaMedicalShopPanel />;
      case "doza-medics":
        return <DozaMedicsPanel />;
      case "doza-map":
        return <DozaMapPanel />;
      case "profile":
        return <ProfilePanel />;
      case "settings":
        return <SettingsPanel />;
      case "appointment":
        return <AppointmentsPanel />;
      case "help":
        return <HelpPanel />;
      case "notifications":
        return <NotificationsPanel />;
      default:
        return <DashboardPanel />;
    }
  };

  return <div className="h-full">{renderPanel()}</div>;
}
