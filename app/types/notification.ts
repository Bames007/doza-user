export type NotificationType =
  | "medication"
  | "appointment"
  | "challenge"
  | "health"
  | "order"
  | "family";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  link?: string;
}

// This matches the structure coming from your /api/dashboard/summary
export interface SummaryResponse {
  success: boolean;
  data: {
    notifications: Omit<Notification, "read">[]; // Server sends everything except 'read'
    stats: {
      medsCount: number;
      upcomingAppts: number;
    };
  };
}
