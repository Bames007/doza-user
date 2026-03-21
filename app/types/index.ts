export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export interface UserProfile {
  displayName: string;
  email: string; // read‑only, from Firebase Auth
  phone?: string;
  dateOfBirth?: string; // ISO date (YYYY-MM-DD)
  gender?: "male" | "female" | "other" | "prefer-not-to-say";
  bloodGroup?: string;
  height?: number; // cm
  weight?: number; // kg
  avatarId?: string; // one of predefined avatars
  emergencyContacts: EmergencyContact[];
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
}

export interface PrivacySettings {
  shareWithFamily: boolean;
  dataRetention: "forever" | "1year" | "6months";
}

export interface SubscriptionInfo {
  plan: "free" | "premium";
  expiry?: string; // ISO date if premium
}

export interface UserSettings {
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  subscription: SubscriptionInfo;
}

interface FamilyFriend {
  id: string;
  name: string;
  phone: string;
  relationship: string; // e.g., 'spouse', 'parent', 'friend'
  isEmergency: boolean; // emergency contact flag
}

interface HealthRecord {
  id: string; // unique ID (generated client-side or by Firebase)
  date: string; // ISO date (YYYY-MM-DD)
  type: string; // e.g., 'heartRate', 'bloodPressure', 'steps', 'sleep', 'weight'
  value: number; // numeric value
  unit?: string; // optional unit, e.g., 'bpm', 'mmHg', 'km', 'hrs', 'kg'
  note?: string;
}

interface Medic {
  id: string;
  name: string;
  specialty: string;
  address: string;
  phone?: string;
  email?: string;
  rating?: number; // 1-5
  reviews?: number;
  education?: string[];
  experience?: string;
  profileImage?: string;
  location?: { lat: number; lng: number };
}

interface Appointment {
  id: string;
  medicId: string;
  medicName: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g., "14:30"
  reason: string;
  status: "upcoming" | "completed" | "cancelled";
  createdAt: string;
}

export interface Plan {
  id: "basic" | "plus" | "premium";
  name: string;
  price: string;
  tagline?: string;
  benefits: string[];
  highlighted?: boolean;
}
