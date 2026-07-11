export type Participant = {
  userId: string;
  name: string;
  photo?: string;
  joinedAt: number;
  progress: number | Record<string, any>;
  completed?: boolean;
};

export type JoinRequest = {
  userId: string;
  name: string;
  photo?: string;
  requestedAt: number;
  status: "pending" | "approved" | "rejected";
};

export type Comment = {
  authorId: string;
  authorName: string;
  authorImage?: string;
  text: string;
  timestamp: number;
};

export type Challenge = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  activity: string;
  targetUnit: string;
  targetValue: number;
  startDate: string;
  endDate: string;
  isPublic: boolean;
  creatorId: string;
  creatorName: string;
  creatorPhoto?: string;
  createdAt: number;
  participantCount: number;
  participants: Record<string, Participant>;
  joinRequests?: Record<string, JoinRequest>;
  comments?: Record<string, Comment>;
  targets?: Array<{ name: string; unit: string; value: number }>;
};
