"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import useSWR, { mutate } from "swr";
import { motion, AnimatePresence, Transition } from "framer-motion";
import {
  Trophy,
  Users,
  Plus,
  Search,
  Globe,
  Lock,
  Calendar,
  Target,
  Activity,
  X,
  Loader2,
  UserPlus,
  MessageCircle,
  Send,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  HelpCircle,
  Heart,
  Award,
  Star,
  BarChart3,
  Share2,
  Medal,
  Sparkles,
  Camera,
  Upload,
  ShieldCheck,
  Crown,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { cn } from "@/app/utils/utils";
import { authFetcher, authPost } from "@/app/utils/client-auth";
import { useUser } from "@/app/dashboard/hooks/useProfile";
import { poppins, bebasNeue } from "@/app/constants";
import { Canvas, useFrame } from "@react-three/fiber";
import { useDashboard } from "../../DashboardContext";
import * as THREE from "three";
import { Float, MeshDistortMaterial } from "@react-three/drei";

// ---------- Spring Transition ----------
const spring: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 20,
};

// ---------- Types ----------
type Participant = {
  userId: string;
  name: string;
  photo?: string;
  joinedAt: number;
  progress: number | Record<string, any>;
  completed?: boolean;
};

type JoinRequest = {
  userId: string;
  name: string;
  photo?: string;
  requestedAt: number;
  status: "pending" | "approved" | "rejected";
};

type Comment = {
  authorId: string;
  authorName: string;
  authorImage?: string;
  text: string;
  timestamp: number;
};

type Challenge = {
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

// ---------- Schemas ----------
const challengeSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters"),
    activity: z.string().min(1, "Select an activity"),
    targetValue: z.coerce.number().positive("Target must be positive"),
    targetUnit: z.string().min(1, "Select unit"),
    startDate: z.string().min(1, "Start date required"),
    endDate: z.string().min(1, "End date required"),
    isPublic: z.boolean(),
    imageUrl: z.string().optional(),
    invitedEmails: z.string().optional(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

type ChallengeForm = z.infer<typeof challengeSchema>;

const commentSchema = z.object({
  text: z.string().min(1, "Comment cannot be empty"),
});

type CommentForm = z.infer<typeof commentSchema>;

// ---------- Activity options ----------
const activityOptions = [
  { value: "running", label: "Running", unit: "km", icon: "🏃" },
  { value: "jogging", label: "Jogging", unit: "km", icon: "🚶" },
  { value: "cycling", label: "Cycling", unit: "km", icon: "🚴" },
  { value: "pushups", label: "Push-ups", unit: "count", icon: "💪" },
  { value: "situps", label: "Sit-ups", unit: "count", icon: "🧘" },
  { value: "squats", label: "Squats", unit: "count", icon: "🏋️" },
  { value: "pullups", label: "Pull-ups", unit: "count", icon: "🤸" },
  { value: "walking", label: "Walking", unit: "steps", icon: "👟" },
  { value: "swimming", label: "Swimming", unit: "laps", icon: "🏊" },
  { value: "other", label: "Other", unit: "", icon: "⚡" },
];

// ---------- Badge definitions ----------
const badges = [
  {
    name: "Bronze",
    threshold: 25,
    color: "text-amber-700",
    bg: "bg-amber-100",
    icon: Medal,
  },
  {
    name: "Silver",
    threshold: 50,
    color: "text-gray-500",
    bg: "bg-gray-100",
    icon: Medal,
  },
  {
    name: "Gold",
    threshold: 75,
    color: "text-yellow-600",
    bg: "bg-yellow-100",
    icon: Award,
  },
  {
    name: "Platinum",
    threshold: 90,
    color: "text-blue-600",
    bg: "bg-blue-100",
    icon: Star,
  },
  {
    name: "Diamond",
    threshold: 100,
    color: "text-purple-600",
    bg: "bg-purple-100",
    icon: Sparkles,
  },
];

// ---------- Helper Components ----------
const BentoTile = ({ children, className, onClick }: any) => (
  <motion.div
    whileHover={{ y: -4 }}
    transition={spring}
    onClick={onClick}
    className={cn(
      "p-7 rounded-[32px] border border-slate-100 transition-all cursor-pointer bg-white",
      className,
    )}
  >
    {children}
  </motion.div>
);

const StatCard = ({ icon: Icon, label, value, unit, color, bg }: any) => (
  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col">
    <div className={cn("p-2 rounded-xl w-fit mb-4", bg)}>
      <Icon size={18} className={color} />
    </div>
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">
      {label}
    </span>
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-black text-slate-900">{value}</span>
      <span className="text-[10px] font-bold text-slate-400">{unit}</span>
    </div>
  </div>
);

// ---------- Main Component ----------
export default function SocialChallengesPanel() {
  const { user, isLoading: userLoading } = useUser();
  const { setActivePanel } = useDashboard();
  const [activeTab, setActiveTab] = useState<"my" | "discover" | "requests">(
    "discover",
  );
  const [search, setSearch] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(
    null,
  );
  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [helpSlide, setHelpSlide] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [showImagePicker, setShowImagePicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // First visit help
  useEffect(() => {
    const hasSeenHelp = localStorage.getItem("doza_challenges_help");
    if (!hasSeenHelp) {
      setShowHelp(true);
      localStorage.setItem("doza_challenges_help", "true");
    }
  }, []);

  // Data fetching
  const { data: myChallengesData, isLoading: myLoading } = useSWR(
    activeTab === "my" ? "/api/challenges?type=my" : null,
    authFetcher,
    { revalidateOnFocus: false, errorRetryCount: 1 },
  );
  const { data: discoverData, isLoading: discoverLoading } = useSWR(
    activeTab === "discover"
      ? `/api/challenges?search=${encodeURIComponent(search)}&activity=${selectedActivity}&visibility=public`
      : null,
    authFetcher,
    { revalidateOnFocus: false, errorRetryCount: 1 },
  );
  const { data: requestsData, isLoading: requestsLoading } = useSWR(
    activeTab === "requests" ? "/api/challenges/requests" : null,
    authFetcher,
    { revalidateOnFocus: false, errorRetryCount: 1 },
  );

  const myChallenges: Challenge[] = myChallengesData?.success
    ? myChallengesData.data.filter(
        (c: Challenge) =>
          c.creatorId === user?.id ||
          (c.participants && c.participants[user?.id || ""]),
      )
    : [];

  const discoverChallenges: Challenge[] = discoverData?.success
    ? discoverData.data
    : [];
  const pendingRequests: any[] = requestsData?.success ? requestsData.data : [];

  const isCreator = (challenge: Challenge) => challenge.creatorId === user?.id;
  const isParticipant = (challenge: Challenge) =>
    challenge.participants && !!challenge.participants[user?.id || ""];

  // Filter challenges
  const now = new Date();
  const filteredChallenges = useMemo(() => {
    let filtered = [
      ...(activeTab === "my" ? myChallenges : discoverChallenges),
    ];

    if (monthFilter !== "all") {
      const year = now.getFullYear();
      const month = parseInt(monthFilter);
      filtered = filtered.filter((c) => {
        const start = new Date(c.startDate);
        return start.getFullYear() === year && start.getMonth() === month;
      });
    }

    const ongoing = filtered.filter((c) => new Date(c.endDate) >= now);
    const ended = filtered.filter((c) => new Date(c.endDate) < now);

    ongoing.sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );
    ended.sort(
      (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
    );

    return { ongoing, ended };
  }, [activeTab, myChallenges, discoverChallenges, monthFilter, now]);

  // User stats
  const userStats = useMemo(() => {
    if (!user)
      return { joined: 0, created: 0, ongoing: 0, points: 0, badges: [] };
    const joined = myChallenges.filter((c) => c.participants?.[user.id]).length;
    const created = myChallenges.filter((c) => c.creatorId === user.id).length;
    const ongoing = myChallenges.filter(
      (c) => c.participants?.[user.id] && new Date(c.endDate) >= now,
    ).length;
    let points = 0;
    const allProgress: number[] = [];
    myChallenges.forEach((c) => {
      const p = c.participants?.[user.id]?.progress || 0;
      points += typeof p === "number" ? p * 10 : 0;
      if (typeof p === "number") allProgress.push((p / c.targetValue) * 100);
    });
    const maxPercent = Math.max(...allProgress, 0);
    const earnedBadges = badges
      .filter((b) => maxPercent >= b.threshold)
      .map((b) => b.name);
    return { joined, created, ongoing, points, badges: earnedBadges };
  }, [myChallenges, user, now]);

  const leaderboard = useMemo(() => {
    const userMap = new Map<
      string,
      { uid: string; name: string; photo?: string; totalPoints: number }
    >();
    [...myChallenges, ...discoverChallenges].forEach((challenge) => {
      Object.entries(challenge.participants || {}).forEach(([uid, p]) => {
        const progress = typeof p.progress === "number" ? p.progress : 0;
        const points = progress * 10;
        const existing = userMap.get(uid);
        if (existing) {
          existing.totalPoints += points;
        } else {
          userMap.set(uid, {
            uid, // ✅ include uid
            name: p.name || "Anonymous",
            photo: p.photo,
            totalPoints: points,
          });
        }
      });
    });
    return Array.from(userMap.values())
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 5);
  }, [myChallenges, discoverChallenges]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ChallengeForm>({
    resolver: zodResolver(challengeSchema) as any,
    mode: "onBlur",
    defaultValues: {
      isPublic: true,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      targetValue: 0,
      activity: "",
      description: "",
      name: "",
      imageUrl: "",
      targetUnit: "",
      invitedEmails: "",
    },
  });

  const watchActivity = watch("activity");
  useEffect(() => {
    const activity = activityOptions.find((a) => a.value === watchActivity);
    if (activity && activity.unit) {
      setValue("targetUnit", activity.unit);
    }
  }, [watchActivity, setValue]);

  // Image picker
  const unsplashImages = [
    "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400",
    "https://images.unsplash.com/photo-1571008887538-b36bb32f1bc6?w=400",
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400",
    "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=400",
    "https://images.unsplash.com/photo-1554284126-aa88f22d8b74?w=400",
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400",
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
      setShowImagePicker(false);
    };
    reader.readAsDataURL(file);
  };

  function FloatingTrophy() {
    // Use null as initial value and specify the Three.js type for better intellisense
    const mesh = useRef<THREE.Mesh>(null!);

    useFrame((state) => {
      if (!mesh.current) return; // Safety check
      const t = state.clock.getElapsedTime();
      mesh.current.rotation.y = t * 0.5;
    });

    return (
      <Float speed={2} rotationIntensity={1} floatIntensity={1}>
        <mesh ref={mesh}>
          <octahedronGeometry args={[1, 0]} />
          <MeshDistortMaterial
            color="#10b981"
            speed={2}
            distort={0.4}
            radius={1}
            emissive="#059669"
          />
        </mesh>
      </Float>
    );
  }

  const onCreateChallenge: SubmitHandler<ChallengeForm> = async (data) => {
    try {
      const payload = {
        ...data,
        imageUrl: selectedImage || undefined,
        creatorName: user?.fullName || "Anonymous",
        creatorPhoto: user?.avatar || null,
      };
      const result = await authPost("/api/challenges", payload);
      if (result.success) {
        mutate("/api/challenges?type=my");
        mutate("/api/challenges?visibility=public");
        setShowCreateModal(false);
        reset();
        setSelectedImage("");
      } else {
        alert("Error: " + result.error);
      }
    } catch {
      alert("Failed to create challenge");
    }
  };

  const handleJoin = async (challengeId: string, isPublic: boolean) => {
    try {
      const endpoint = isPublic
        ? `/api/challenges/${challengeId}/join`
        : `/api/challenges/${challengeId}/request`;
      const result = await authPost(endpoint, {
        userName: user?.fullName || "Anonymous",
        userPhoto: user?.avatar || null,
      });
      if (result.success) {
        mutate(`/api/challenges/${challengeId}`);
        mutate("/api/challenges?type=my");
        mutate("/api/challenges?visibility=public");
        if (!isPublic) mutate("/api/challenges/requests");
      } else {
        alert("Error: " + (result.error || "Failed to join"));
      }
    } catch (err) {
      console.error("Join error:", err);
      alert("Network error. Please check your connection and try again.");
    }
  };

  const handleApprove = async (challengeId: string, userId: string) => {
    try {
      const result = await authPost(`/api/challenges/${challengeId}/approve`, {
        userId,
      });
      if (result.success) {
        mutate(`/api/challenges/${challengeId}`);
        mutate("/api/challenges/requests");
      } else {
        alert("Error: " + result.error);
      }
    } catch {
      alert("Failed to approve");
    }
  };

  const handleLeave = async (challengeId: string) => {
    if (!confirm("Are you sure you want to leave this challenge?")) return;
    try {
      const result = await authPost(`/api/challenges/${challengeId}/leave`, {});
      if (result.success) {
        mutate("/api/challenges?type=my");
        mutate("/api/challenges?visibility=public");
        setSelectedChallenge(null);
      } else {
        alert("Error: " + result.error);
      }
    } catch {
      alert("Failed to leave");
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    try {
      const result = await authPost("/api/challenges/join-by-code", {
        code: joinCode,
      });
      if (result.success) {
        mutate("/api/challenges?type=my");
        setShowJoinCodeModal(false);
        setJoinCode("");
      } else {
        alert("Error: " + result.error);
      }
    } catch {
      alert("Failed to join by code");
    }
  };

  const commentForm = useForm<CommentForm>({
    resolver: zodResolver(commentSchema),
  });
  const onAddComment = async (data: CommentForm) => {
    if (!selectedChallenge) return;
    try {
      const result = await authPost(
        `/api/challenges/${selectedChallenge.id}/comments`,
        data,
      );
      if (result.success) {
        mutate(`/api/challenges/${selectedChallenge.id}`);
        commentForm.reset();
      } else {
        alert("Error: " + (result.error || "Failed to add comment"));
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Please try again.");
    }
  };

  const [progressValue, setProgressValue] = useState<number>(0);
  const handleProgressUpdate = async (challengeId: string) => {
    try {
      const result = await authPost(`/api/challenges/${challengeId}/progress`, {
        progress: progressValue,
      });
      if (result.success) {
        mutate(`/api/challenges/${challengeId}`);
        setSelectedChallenge((prev) => {
          if (!prev) return prev;
          const updated = { ...prev };
          if (updated.participants[user?.id || ""]) {
            updated.participants[user?.id || ""].progress = progressValue;
          }
          return updated;
        });
      } else {
        alert("Error: " + (result.error || "Failed to update progress"));
      }
    } catch {
      alert("Network error. Please try again.");
    }
  };

  const badgeRef = useRef<HTMLDivElement>(null);
  const shareBadge = async () => {
    if (!badgeRef.current) return;
    try {
      const canvas = await html2canvas(badgeRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "doza-badge.png";
      link.href = imgData;
      link.click();
      const pdf = new jsPDF();
      pdf.addImage(imgData, "PNG", 10, 10, 180, 100);
      pdf.save("doza-badge.pdf");
    } catch (err) {
      console.error("Failed to generate badge", err);
    }
  };

  const helpSlides = [
    {
      icon: <Trophy className="w-12 h-12 text-emerald-600" />,
      title: "Create Challenges",
      description:
        "Start a workout challenge – set a goal, invite friends, and track progress together.",
    },
    {
      icon: <Globe className="w-12 h-12 text-emerald-600" />,
      title: "Discover Public Challenges",
      description:
        "Find global challenges or search by name. Join and compete with others.",
    },
    {
      icon: <Lock className="w-12 h-12 text-emerald-600" />,
      title: "Private Challenges",
      description:
        "Create invite‑only challenges. Share a code so only selected friends can join.",
    },
    {
      icon: <TrendingUp className="w-12 h-12 text-emerald-600" />,
      title: "Real‑time Progress",
      description:
        "Log your daily progress and see how you stack up against others on the leaderboard.",
    },
    {
      icon: <Award className="w-12 h-12 text-emerald-600" />,
      title: "Earn Badges & Points",
      description:
        "Complete challenges to earn points and unlock beautiful badges. Share your achievements!",
    },
  ];

  const isLoading =
    userLoading || myLoading || discoverLoading || requestsLoading;

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-3 pb-24 min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-3 pb-24 min-h-screen pt-4 text-center">
        Unable to load user data
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[32px] border border-slate-200/60 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                Challenge Sync Active
              </p>
            </div>
            <h1
              className={cn(
                "text-4xl md:text-5xl text-slate-900 leading-none",
                bebasNeue.className,
              )}
            >
              Social <span className="text-emerald-600">Challenges</span>
            </h1>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            className="h-12 w-12 flex items-center justify-center bg-slate-50 rounded-2xl text-slate-400 hover:text-emerald-600 transition-colors border border-slate-100"
          >
            <HelpCircle size={20} />
          </button>
        </header>

        {/* Stats & Leaderboard Row */}
        <div
          className={cn(
            "grid grid-cols-1 lg:grid-cols-12 gap-6 p-4",
            poppins.className,
          )}
        >
          {/* LEFT: USER PERFORMANCE PANEL (8 Columns) */}
          <div className="lg:col-span-8 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl overflow-hidden group"
            >
              {/* 3D Visual Element inside the Bento Tile */}
              <div className="absolute top-0 right-0 w-48 h-48 opacity-40 group-hover:opacity-100 transition-opacity pointer-events-none">
                <Canvas camera={{ position: [0, 0, 4] }}>
                  <ambientLight intensity={0.5} />
                  <pointLight position={[10, 10, 10]} />
                  <Suspense fallback={null}>
                    <FloatingTrophy />
                  </Suspense>
                </Canvas>
              </div>

              <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
                {/* Avatar Section */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-[28px] bg-emerald-50 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : (
                      <span
                        className={cn(
                          "text-4xl text-emerald-600 font-bold",
                          bebasNeue.className,
                        )}
                      >
                        {user.fullName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-slate-900 text-white p-2 rounded-xl shadow-lg border-2 border-white">
                    <Crown className="w-4 h-4 text-yellow-400" />
                  </div>
                </div>

                {/* User Bio */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4">
                    <h2
                      className={cn(
                        "text-4xl font-bold text-slate-900",
                        bebasNeue.className,
                      )}
                    >
                      {user.fullName}
                    </h2>
                    <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full self-center">
                      PRO LEVEL
                    </span>
                  </div>

                  {/* Stat Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      {
                        icon: Target,
                        label: "Points",
                        value: userStats.points,
                        color: "text-emerald-600",
                        bg: "bg-emerald-50",
                      },
                      {
                        icon: Activity,
                        label: "Active",
                        value: userStats.ongoing,
                        color: "text-blue-600",
                        bg: "bg-blue-50",
                      },
                      {
                        icon: Trophy,
                        label: "Won",
                        value: userStats.created,
                        color: "text-amber-600",
                        bg: "bg-amber-50",
                      },
                      {
                        icon: Users,
                        label: "Friends",
                        value: userStats.joined,
                        color: "text-purple-600",
                        bg: "bg-purple-50",
                      },
                    ].map((stat, i) => (
                      <div
                        key={i}
                        className={cn(
                          "p-4 rounded-3xl border border-white shadow-sm flex flex-col items-center md:items-start",
                          stat.bg,
                        )}
                      >
                        <stat.icon className={cn("w-5 h-5 mb-2", stat.color)} />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {stat.label}
                        </span>
                        <span className="text-xl font-bold text-slate-900">
                          {stat.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT: ELITE LEADERBOARD (4 Columns) */}
          <div className="lg:col-span-4">
            <div className="bg-slate-900 rounded-[32px] p-6 shadow-2xl h-full border border-slate-800 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/20 p-2 rounded-xl">
                    <Medal className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3
                    className={cn(
                      "text-xl text-white font-bold",
                      bebasNeue.className,
                    )}
                  >
                    Global Elite
                  </h3>
                </div>
                <ArrowUpRight className="w-5 h-5 text-slate-500" />
              </div>

              <div className="space-y-4 flex-1">
                {leaderboard.map((entry: any, idx: number) => {
                  const isTop3 = idx < 3;
                  const isMe = entry.uid === user.id;

                  return (
                    <motion.div
                      key={entry.uid}
                      whileHover={{ x: 8 }}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-2xl transition-all border",
                        isMe
                          ? "bg-emerald-500/10 border-emerald-500/40"
                          : "bg-white/5 border-transparent",
                      )}
                    >
                      {/* Rank Logic */}
                      <div className="w-8 flex justify-center">
                        {idx === 0 ? (
                          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        ) : idx === 1 ? (
                          <div className="text-slate-400 font-bold">2</div>
                        ) : idx === 2 ? (
                          <div className="text-amber-600 font-bold">3</div>
                        ) : (
                          <div className="text-slate-600 text-xs">
                            {idx + 1}
                          </div>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full border-2 border-slate-700 overflow-hidden shrink-0">
                        <img
                          src={
                            entry.photo ||
                            `https://ui-avatars.com/api/?name=${entry.name}`
                          }
                          alt=""
                        />
                      </div>

                      {/* Name & Points */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm font-bold truncate",
                            isMe ? "text-emerald-400" : "text-white",
                          )}
                        >
                          {entry.name}
                        </p>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            Hot Streak
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-black text-white">
                          {entry.totalPoints}
                        </p>
                        <p className="text-[10px] font-bold text-emerald-500 uppercase">
                          Pts
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <button className="mt-6 w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors">
                View Full Rankings
              </button>
            </div>
          </div>
        </div>

        {/* Shop Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => setActivePanel("doza-sport-shop")}
          className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600/80 to-teal-500/80 shadow-md cursor-pointer active:scale-[0.98] transition-transform"
          style={{ height: 100 }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: "url('/assets/shop/smart_watch.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-500 opacity-40 group-hover:opacity-50 transition" />
          <div className="relative z-10 h-full flex items-center justify-between px-4 text-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="truncate">
                <h2
                  className={cn(
                    "text-lg font-bold truncate",
                    bebasNeue.className,
                  )}
                >
                  Doza Sport Shop
                </h2>
                <p className="text-sm text-white/80 truncate">
                  Gear up with the latest sport equipment
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 shrink-0" />
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="space-y-6">
          {/* TOP TOOLBAR: Slimmer & More Sophisticated */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-center shadow-sm">
                <Activity className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex flex-col">
                <h2
                  className={cn(
                    "text-xl tracking-tight text-slate-900 leading-none",
                    bebasNeue.className,
                  )}
                >
                  Challenge Hub
                </h2>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Network Live
                </span>
              </div>
            </div>

            {/* Buttons: Using Ghost/Outline style for secondary to reduce "thickness" */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowJoinCodeModal(true)}
                className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
              >
                <Lock className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create</span>
              </button>
            </div>
          </div>

          {/* TABS: Ultra-Thin "Glass" Pill */}
          <div className="bg-slate-100/40 backdrop-blur-md p-1 rounded-2xl flex items-center border border-slate-200/50">
            {[
              { id: "discover", label: "Discover", icon: Globe, badge: 0 },
              { id: "my", label: "Active", icon: Users, badge: 0 },
              {
                id: "requests",
                label: "Inbox",
                icon: UserPlus,
                badge: pendingRequests.length,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "relative flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
                    isActive
                      ? "text-slate-900"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                >
                  {/* Subtle Indicator: Instead of a heavy block, use a white floating pill */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabPill"
                      className="absolute inset-0 bg-white border border-slate-200/50 shadow-sm rounded-[10px]"
                      transition={{
                        type: "spring",
                        bounce: 0.15,
                        duration: 0.5,
                      }}
                    />
                  )}

                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon
                      className={cn(
                        "w-3.5 h-3.5",
                        isActive ? "text-emerald-600" : "text-slate-400",
                      )}
                    />
                    {tab.label}
                    {tab.badge > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {/* Search & Filter (discover only) */}
        {activeTab === "discover" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-20 mb-8 px-1"
          >
            {/* Elite Glass Container */}
            <div className="bg-white/80 backdrop-blur-2xl rounded-[28px] p-2 border border-slate-200/60 shadow-2xl shadow-emerald-900/5">
              <div className="flex flex-col md:flex-row items-stretch gap-2">
                {/* Search Input */}
                <div className="flex-1 relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="text-slate-400 group-focus-within:text-emerald-500 transition-colors w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search elite challenges..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={cn(
                      "w-full pl-11 pr-4 py-3.5 text-sm bg-slate-100/50 border border-transparent rounded-[20px]",
                      "focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5",
                      "transition-all duration-300 outline-none text-slate-900 placeholder:text-slate-500 font-semibold",
                    )}
                  />
                </div>

                {/* Filters Wrapper */}
                <div className="flex gap-2 flex-1 md:flex-none">
                  {/* Activity Filter Pill */}
                  <div className="relative flex-1 md:w-40 flex items-center gap-2 px-3 bg-slate-100/50 border border-transparent rounded-[20px] hover:bg-white hover:shadow-sm transition-all h-12 md:h-auto overflow-hidden group">
                    <Activity className="w-4 h-4 text-emerald-600 shrink-0" />

                    <select
                      value={selectedActivity}
                      onChange={(e) => setSelectedActivity(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer appearance-none bg-white text-slate-900"
                    >
                      <option value="" className="text-slate-900">
                        All Activities
                      </option>
                      {activityOptions.map((act) => (
                        <option
                          key={act.value}
                          value={act.value}
                          className="text-slate-900"
                        >
                          {act.label}
                        </option>
                      ))}
                    </select>

                    <div className="flex flex-col min-w-0 pointer-events-none">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter leading-none mb-0.5">
                        Activity
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {selectedActivity
                          ? activityOptions.find(
                              (a) => a.value === selectedActivity,
                            )?.label
                          : "All"}
                      </span>
                    </div>

                    <ChevronDown className="ml-auto w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-500 transition-colors pointer-events-none" />
                  </div>

                  {/* Month Filter Pill */}
                  <div className="relative flex-1 md:w-36 flex items-center gap-2 px-3 bg-slate-100/50 border border-transparent rounded-[20px] hover:bg-white hover:shadow-sm transition-all h-12 md:h-auto overflow-hidden group">
                    <Calendar className="w-4 h-4 text-blue-600 shrink-0" />

                    <select
                      value={monthFilter}
                      onChange={(e) => setMonthFilter(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer appearance-none bg-white text-slate-900"
                    >
                      <option value="all" className="text-slate-900">
                        Full Season
                      </option>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i} className="text-slate-900">
                          {new Date(0, i).toLocaleString("default", {
                            month: "long",
                          })}
                        </option>
                      ))}
                    </select>

                    <div className="flex flex-col min-w-0 pointer-events-none">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter leading-none mb-0.5">
                        Season
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {monthFilter === "all"
                          ? "All"
                          : new Date(0, parseInt(monthFilter)).toLocaleString(
                              "default",
                              { month: "short" },
                            )}
                      </span>
                    </div>

                    <ChevronDown className="ml-auto w-3.5 h-3.5 text-slate-500 group-hover:text-blue-500 transition-colors pointer-events-none" />
                  </div>
                </div>

                {/* Reset Action */}
                <button
                  onClick={() => {
                    setSearch("");
                    setSelectedActivity("");
                    setMonthFilter("all");
                  }}
                  className="hidden md:flex px-6 py-3.5 bg-slate-900 text-white rounded-[20px] text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Live Status Indicator */}
            <div className="mt-3 px-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <span
                  className={cn(
                    "text-[11px] font-bold text-slate-500 uppercase tracking-widest",
                    bebasNeue.className,
                  )}
                >
                  Showing {discoverChallenges.length} Active Rounds
                </span>
              </div>
              {search && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-tight"
                >
                  Query: {search}
                </motion.span>
              )}
            </div>
          </motion.div>
        )}

        {/* Ongoing Challenges */}
        {filteredChallenges.ongoing.length > 0 && (
          <div className="space-y-3">
            <h2
              className={cn(
                "text-sm font-semibold text-slate-800 flex items-center gap-2",
                bebasNeue.className,
              )}
            >
              <span className="w-1 h-4 bg-emerald-500 rounded-full" /> Ongoing
              Challenges
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChallenges.ongoing.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  profile={user}
                  isCreator={isCreator(challenge)}
                  isParticipant={isParticipant(challenge)}
                  onJoin={() => handleJoin(challenge.id, challenge.isPublic)}
                  onView={() => setSelectedChallenge(challenge)}
                  onLeave={() => handleLeave(challenge.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Ended Challenges */}
        {filteredChallenges.ended.length > 0 && (
          <div className="space-y-3">
            <h2
              className={cn(
                "text-sm font-semibold text-slate-800 flex items-center gap-2",
                bebasNeue.className,
              )}
            >
              <span className="w-1 h-4 bg-slate-400 rounded-full" /> Ended
              Challenges
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
              {filteredChallenges.ended.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  profile={user}
                  isCreator={isCreator(challenge)}
                  isParticipant={isParticipant(challenge)}
                  onJoin={() => handleJoin(challenge.id, challenge.isPublic)}
                  onView={() => setSelectedChallenge(challenge)}
                  onLeave={() => handleLeave(challenge.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty States */}
        {activeTab === "discover" &&
          filteredChallenges.ongoing.length === 0 &&
          filteredChallenges.ended.length === 0 && (
            <EmptyState
              icon={<Globe className="w-10 h-10 text-slate-400" />}
              title="No challenges found"
              description="Try adjusting your search or create a new challenge."
              action={() => setShowCreateModal(true)}
              actionLabel="Create Challenge"
            />
          )}
        {activeTab === "my" &&
          filteredChallenges.ongoing.length === 0 &&
          filteredChallenges.ended.length === 0 && (
            <EmptyState
              icon={<Users className="w-10 h-10 text-slate-400" />}
              title="You haven't joined any challenges"
              description="Join a public challenge or create your own to get started."
              action={() => setActiveTab("discover")}
              actionLabel="Discover Challenges"
            />
          )}
        {activeTab === "requests" && pendingRequests.length === 0 && (
          <EmptyState
            icon={<UserPlus className="w-10 h-10 text-slate-400" />}
            title="No pending requests"
            description="When someone requests to join your private challenge, you'll see it here."
          />
        )}

        {/* Requests Cards */}
        {activeTab === "requests" && pendingRequests.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingRequests.map((req: any) => (
              <RequestCard
                key={req.id}
                request={req}
                onApprove={() => handleApprove(req.challengeId, req.userId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* --- MODALS (unchanged, placed outside the main container to avoid overflow) --- */}

      {/* Create Challenge Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <Modal onClose={() => setShowCreateModal(false)} size="lg">
            <h2
              className={cn(
                "text-lg font-bold text-gray-900 mb-3",
                bebasNeue.className,
              )}
            >
              Create a New Challenge
            </h2>
            <form
              onSubmit={handleSubmit(onCreateChallenge)}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Challenge Name *
                </label>
                <input
                  {...register("name")}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., April Marathon"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  {...register("description")}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  placeholder="What's the goal? Any rules?"
                />
                {errors.description && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.description.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Activity *
                  </label>
                  <select
                    {...register("activity")}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select</option>
                    {activityOptions.map((act) => (
                      <option key={act.value} value={act.value}>
                        {act.label}
                      </option>
                    ))}
                  </select>
                  {errors.activity && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.activity.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Target *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      {...register("targetValue")}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl"
                      placeholder="20"
                    />
                    <input
                      {...register("targetUnit")}
                      className="w-16 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50"
                      readOnly
                    />
                  </div>
                  {errors.targetValue && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.targetValue.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    {...register("startDate")}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
                  />
                  {errors.startDate && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.startDate.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    {...register("endDate")}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
                  />
                  {errors.endDate && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.endDate.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    {...register("isPublic")}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />{" "}
                  Public
                </label>
                <span className="text-xs text-gray-400">or</span>
                <label className="flex items-center gap-2 text-xs text-gray-700">
                  <Lock className="w-4 h-4" /> Private
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Invite by email (optional, comma separated)
                </label>
                <input
                  {...register("invitedEmails")}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
                  placeholder="friend@example.com, another@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Challenge Image
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImagePicker(!showImagePicker)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition text-xs"
                  >
                    <Camera className="w-4 h-4 inline mr-1" />{" "}
                    {selectedImage ? "Change" : "Choose"}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition text-xs"
                  >
                    <Upload className="w-4 h-4 inline mr-1" /> Upload
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {selectedImage && (
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden">
                      <img
                        src={selectedImage}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedImage("")}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                {showImagePicker && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 grid grid-cols-3 gap-2 overflow-hidden"
                  >
                    {unsplashImages.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedImage(url);
                          setShowImagePicker(false);
                        }}
                        className="relative aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-emerald-500"
                      >
                        <img
                          src={url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
                  Create
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Join by Code Modal */}
      <AnimatePresence>
        {showJoinCodeModal && (
          <Modal onClose={() => setShowJoinCodeModal(false)}>
            <h2
              className={cn(
                "text-lg font-bold text-gray-900 mb-3",
                bebasNeue.className,
              )}
            >
              Join Private Challenge
            </h2>
            <div className="space-y-3">
              <p className="text-xs text-gray-600">
                Enter the code you received from the challenge creator.
              </p>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="e.g., SPRINT2025"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowJoinCodeModal(false)}
                  className="flex-1 px-3 py-2 text-sm bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinByCode}
                  className="flex-1 px-3 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
                >
                  Join
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Challenge Detail Modal */}
      <AnimatePresence>
        {selectedChallenge && (
          <Modal onClose={() => setSelectedChallenge(null)} size="lg">
            <ChallengeDetail
              challenge={selectedChallenge}
              profile={user}
              isCreator={isCreator(selectedChallenge)}
              isParticipant={isParticipant(selectedChallenge)}
              onJoin={() =>
                handleJoin(selectedChallenge.id, selectedChallenge.isPublic)
              }
              onLeave={() => handleLeave(selectedChallenge.id)}
              onProgressUpdate={handleProgressUpdate}
              progressValue={progressValue}
              setProgressValue={setProgressValue}
              onAddComment={onAddComment}
              commentForm={commentForm}
              shareBadge={shareBadge}
              badgeRef={badgeRef}
            />
          </Modal>
        )}
      </AnimatePresence>

      {/* Help Carousel Modal */}
      <AnimatePresence>
        {showHelp && (
          <Modal onClose={() => setShowHelp(false)}>
            <div className="flex items-center justify-between mb-3">
              <h2
                className={cn(
                  "text-lg font-bold text-gray-900 flex items-center gap-2",
                  bebasNeue.className,
                )}
              >
                <HelpCircle className="w-5 h-5 text-emerald-600" /> How to use
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={helpSlide}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center text-center p-2"
                >
                  <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-2">
                    {helpSlides[helpSlide].icon}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">
                    {helpSlides[helpSlide].title}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {helpSlides[helpSlide].description}
                  </p>
                </motion.div>
              </AnimatePresence>
              <div className="flex justify-center gap-2 mt-3">
                {helpSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setHelpSlide(idx)}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition",
                      idx === helpSlide ? "bg-emerald-600 w-3" : "bg-gray-300",
                    )}
                  />
                ))}
              </div>
              <button
                onClick={() =>
                  setHelpSlide((prev) =>
                    prev === 0 ? helpSlides.length - 1 : prev - 1,
                  )
                }
                className="absolute left-0 top-1/2 -translate-y-1/2 p-1 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() =>
                  setHelpSlide((prev) =>
                    prev === helpSlides.length - 1 ? 0 : prev + 1,
                  )
                }
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm"
            >
              Get Started
            </button>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Subcomponents ----------

const EmptyState = ({ icon, title, description, action, actionLabel }: any) => (
  <div className="bg-white/60 backdrop-blur-sm p-6 text-center text-gray-500 rounded-2xl border border-gray-100 shadow-sm">
    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
      {icon}
    </div>
    <p className="text-sm font-medium text-gray-700 mb-1">{title}</p>
    <p className="text-xs mb-3 max-w-md mx-auto">{description}</p>
    {action && (
      <button
        onClick={action}
        className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition inline-flex items-center gap-2 text-xs shadow-sm"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

const ChallengeCard = ({
  challenge,
  profile,
  isCreator,
  isParticipant,
  onJoin,
  onView,
  onLeave,
}: any) => {
  const start = new Date(challenge.startDate);
  const end = new Date(challenge.endDate);
  const now = new Date();
  const isActive = now >= start && now <= end;
  const daysLeft = Math.ceil(
    (end.getTime() - now.getTime()) / (1000 * 3600 * 24),
  );

  const rawProgress = challenge.participants?.[profile?.id || ""]?.progress;
  const userProgress = typeof rawProgress === "number" ? rawProgress : 0;
  const progressDisplay =
    typeof rawProgress === "number"
      ? `${rawProgress} / ${challenge.targetValue} ${challenge.targetUnit}`
      : "Multi-target";
  const percent =
    typeof rawProgress === "number"
      ? Math.min(100, (rawProgress / challenge.targetValue) * 100)
      : 0;
  const activity = activityOptions.find((a) => a.value === challenge.activity);

  return (
    <motion.div
      layout
      whileHover={{ y: -4 }}
      className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer"
      onClick={onView}
    >
      {challenge.imageUrl ? (
        <div className="h-28 w-full overflow-hidden">
          <img
            src={challenge.imageUrl}
            alt={challenge.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-28 bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center">
          <Trophy className="w-8 h-8 text-white/30" />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
            {challenge.name}
          </h3>
          <div className="flex items-center gap-1">
            {challenge.isPublic ? (
              <Globe className="w-3 h-3 text-emerald-600" />
            ) : (
              <Lock className="w-3 h-3 text-amber-600" />
            )}
          </div>
        </div>
        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
          {challenge.description}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500 mb-2">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3" />{" "}
            {activity?.label || challenge.activity}
          </span>
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3" /> {challenge.targetValue}{" "}
            {challenge.targetUnit}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {challenge.participantCount}
          </span>
        </div>
        {isParticipant && (
          <div className="mb-2">
            <div className="flex justify-between text-[10px] text-gray-600 mb-1">
              <span>Your progress</span>
              <span>{progressDisplay}</span>
            </div>
            {typeof rawProgress === "number" && (
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  className="bg-emerald-500 h-1.5 rounded-full"
                />
              </div>
            )}
          </div>
        )}
        <div className="flex items-center justify-between flex-wrap gap-1">
          <div className="flex items-center gap-1">
            {challenge.creatorPhoto ? (
              <img
                src={challenge.creatorPhoto}
                alt={challenge.creatorName}
                className="w-4 h-4 rounded-full border border-emerald-200"
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-[8px] font-bold">
                {challenge.creatorName?.charAt(0)}
              </div>
            )}
            <span className="text-[10px] text-gray-500 truncate max-w-[80px]">
              by {challenge.creatorName}
            </span>
          </div>
          <div className="flex gap-1">
            {isActive ? (
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                {daysLeft}d left
              </span>
            ) : now < start ? (
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                Starts soon
              </span>
            ) : (
              <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                Ended
              </span>
            )}
            {isCreator ? (
              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                Creator
              </span>
            ) : isParticipant ? (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                Joined
              </span>
            ) : null}
          </div>
        </div>
        {!isCreator && !isParticipant && challenge.isPublic && isActive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onJoin();
            }}
            className="mt-2 w-full py-2 bg-emerald-600 text-white text-xs rounded-xl hover:bg-emerald-700 transition"
          >
            Join
          </button>
        )}
      </div>
    </motion.div>
  );
};

const RequestCard = ({ request, onApprove }: any) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
    <div className="flex items-center gap-2">
      {request.photo ? (
        <img
          src={request.photo}
          alt={request.name}
          className="w-8 h-8 rounded-full"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold">
          {request.name?.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {request.name}
        </p>
        <p className="text-[10px] text-gray-500 truncate">
          wants to join "{request.challengeName}"
        </p>
        <p className="text-[10px] text-gray-400 mt-1">
          {new Date(request.requestedAt).toLocaleDateString()}
        </p>
      </div>
      <button
        onClick={onApprove}
        className="px-2 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700"
      >
        Approve
      </button>
    </div>
  </div>
);

const ChallengeDetail = ({
  challenge,
  profile,
  isCreator,
  isParticipant,
  onJoin,
  onLeave,
  onProgressUpdate,
  progressValue,
  setProgressValue,
  onAddComment,
  commentForm,
  shareBadge,
  badgeRef,
}: any) => {
  const [showProgressInput, setShowProgressInput] = useState(false);

  const participants = useMemo(() => {
    return Object.entries(challenge.participants || {})
      .map(([uid, data]) => ({ uid, ...(data as Participant) })) // ✅ cast to Participant
      .sort((a, b) => {
        const aVal = typeof a.progress === "number" ? a.progress : 0;
        const bVal = typeof b.progress === "number" ? b.progress : 0;
        return bVal - aVal;
      });
  }, [challenge.participants]);

  const uniqueParticipants = useMemo(() => {
    const seen = new Set<string>();
    return participants.filter((p) => {
      if (seen.has(p.uid)) return false;
      seen.add(p.uid);
      return true;
    });
  }, [participants]);

  const comments = useMemo(
    () =>
      Object.values(challenge.comments || {}).sort(
        (a, b) => (b as Comment).timestamp - (a as Comment).timestamp,
      ),
    [challenge.comments],
  );

  const rawProgress = challenge.participants?.[profile?.id || ""]?.progress;
  let userProgress = 0,
    progressDisplay = "";
  if (typeof rawProgress === "number") {
    userProgress = rawProgress;
    progressDisplay = `${userProgress} / ${challenge.targetValue} ${challenge.targetUnit}`;
  } else if (rawProgress && typeof rawProgress === "object") {
    progressDisplay = Object.entries(rawProgress)
      .map(([key, val]) => `${key}: ${val}`)
      .join(", ");
  }

  let percent = 0;
  if (
    typeof challenge.targetValue === "number" &&
    challenge.targetValue > 0 &&
    typeof userProgress === "number"
  ) {
    percent = (userProgress / challenge.targetValue) * 100;
  }

  const chartData = useMemo(() => {
    if (typeof userProgress !== "number") return [];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return {
        date: d.toLocaleDateString(undefined, { weekday: "short" }),
        progress: Math.min(
          userProgress,
          Math.floor(Math.random() * userProgress) + 1,
        ),
      };
    }).reverse();
  }, [userProgress]);

  const earnedBadges = badges.filter((b) => percent >= b.threshold);
  const points =
    typeof userProgress === "number" ? Math.floor(userProgress * 10) : 0;

  const now = new Date();
  const isActive =
    now >= new Date(challenge.startDate) && now <= new Date(challenge.endDate);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          {challenge.imageUrl ? (
            <img
              src={challenge.imageUrl}
              alt={challenge.name}
              className="w-14 h-14 rounded-xl object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white/50" />
            </div>
          )}
          <div>
            <h2
              className={cn(
                "text-base font-bold text-gray-900",
                bebasNeue.className,
              )}
            >
              {challenge.name}
            </h2>
            <p className="text-emerald-600 text-xs capitalize">
              {challenge.activity}
            </p>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />{" "}
                {new Date(challenge.startDate).toLocaleDateString()}
              </span>
              <span>→</span>
              <span>{new Date(challenge.endDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {challenge.isPublic ? (
            <Globe className="w-4 h-4 text-emerald-600" />
          ) : (
            <Lock className="w-4 h-4 text-amber-600" />
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <h3 className="font-semibold text-gray-800 text-xs mb-1">About</h3>
        <p className="text-xs text-gray-600">{challenge.description}</p>
      </div>

      {/* Target and progress */}
      <div className="bg-gray-50 rounded-xl p-3">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
          <span>Target</span>
          <span className="font-bold text-gray-900">
            {challenge.targetValue} {challenge.targetUnit}
          </span>
        </div>
        {isParticipant && (
          <>
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Your progress</span>
              <span>{progressDisplay}</span>
            </div>
            {typeof challenge.targetValue === "number" &&
              challenge.targetValue > 0 &&
              typeof userProgress === "number" && (
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    className="bg-emerald-500 h-2 rounded-full"
                  />
                </div>
              )}
            {isActive && (
              <>
                {!showProgressInput ? (
                  <button
                    onClick={() => setShowProgressInput(true)}
                    className="w-full py-2 bg-emerald-100 text-emerald-700 text-xs rounded-lg hover:bg-emerald-200"
                  >
                    Update Progress
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="number"
                      value={progressValue}
                      onChange={(e) =>
                        setProgressValue(parseFloat(e.target.value) || 0)
                      }
                      className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg"
                      placeholder="New value"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onProgressUpdate(challenge.id);
                          setShowProgressInput(false);
                        }}
                        className="flex-1 sm:flex-none px-3 py-2 bg-emerald-600 text-white text-xs rounded-lg"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setShowProgressInput(false)}
                        className="flex-1 sm:flex-none px-3 py-2 bg-gray-200 text-gray-700 text-xs rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Points & Badges */}
      {isParticipant && (
        <div className="bg-gradient-to-r from-amber-50 to-emerald-50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-800 text-xs flex items-center gap-2">
              <Award className="w-4 h-4" /> Your Achievements
            </h3>
            <span className="text-xs font-medium text-gray-700">
              {points} points
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => {
              const earned = percent >= badge.threshold;
              const Icon = badge.icon;
              return (
                <div
                  key={badge.name}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                    earned ? badge.bg : "bg-gray-100 text-gray-400",
                    earned ? badge.color : "",
                  )}
                >
                  <Icon className="w-3 h-3" /> {badge.name}
                </div>
              );
            })}
          </div>
          {earnedBadges.length > 0 && (
            <button
              onClick={shareBadge}
              className="mt-2 flex items-center gap-2 text-[10px] text-emerald-700 hover:text-emerald-800"
            >
              <Share2 className="w-3 h-3" /> Share your badge
            </button>
          )}
          <div ref={badgeRef} className="hidden">
            <div className="w-[300px] p-4 bg-emerald-600 rounded-2xl text-white shadow-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-10 h-10" />
                <div>
                  <h2
                    className="text-xl font-bold"
                    style={{ fontFamily: bebasNeue.style.fontFamily }}
                  >
                    {profile?.fullName || "Athlete"}
                  </h2>
                  <p className="text-xs">completed {challenge.name}</p>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <p>🎯 {progressDisplay}</p>
                <p>⭐ {points} points earned</p>
                <div className="flex gap-2 mt-1">
                  {earnedBadges.map((b) => (
                    <span
                      key={b.name}
                      className="px-2 py-0.5 bg-white/20 rounded-full text-[10px]"
                    >
                      {b.name}
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-[10px] text-white/70">
                Join me on DozaMedic!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Graph */}
      {isParticipant &&
        typeof userProgress === "number" &&
        chartData.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-800 text-xs mb-2 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Progress (last 7 days)
            </h3>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 8 }} />
                  <YAxis tick={{ fontSize: 8 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="progress"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      {/* Participants */}
      <div>
        <h3 className="font-semibold text-gray-800 text-xs mb-2 flex items-center gap-2">
          <Users className="w-4 h-4" /> Participants ({participants.length})
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {uniqueParticipants.map((p) => {
            const progressVal = typeof p.progress === "number" ? p.progress : 0;
            const pct = challenge.targetValue
              ? (progressVal / challenge.targetValue) * 100
              : 0;
            return (
              <div
                key={p.uid}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
              >
                {p.photo ? (
                  <img
                    src={p.photo}
                    alt={p.name}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">
                    {p.name?.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {p.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-600 whitespace-nowrap">
                      {typeof p.progress === "object"
                        ? "multi"
                        : `${p.progress} / ${challenge.targetValue}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comments */}
      <div>
        <h3 className="font-semibold text-gray-800 text-xs mb-2 flex items-center gap-2">
          <MessageCircle className="w-4 h-4" /> Comments
        </h3>
        {isParticipant && isActive && (
          <form
            onSubmit={commentForm.handleSubmit(onAddComment)}
            className="flex gap-2 mb-3"
          >
            <input
              {...commentForm.register("text")}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        )}
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-xs text-gray-400">No comments yet.</p>
          ) : (
            comments.map((c: any) => (
              <div key={c.timestamp} className="flex gap-2">
                {c.authorImage ? (
                  <img
                    src={c.authorImage}
                    alt={c.authorName}
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-[10px]">
                    {c.authorName?.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-900">
                      {c.authorName}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(c.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700">{c.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
        {isCreator ? (
          <>
            <button className="flex-1 py-2 bg-emerald-600 text-white text-xs rounded-xl hover:bg-emerald-700">
              Edit
            </button>
            <button className="flex-1 py-2 bg-red-600 text-white text-xs rounded-xl hover:bg-red-700">
              Delete
            </button>
          </>
        ) : isParticipant ? (
          <button
            onClick={onLeave}
            className="flex-1 py-2 bg-gray-200 text-gray-800 text-xs rounded-xl hover:bg-gray-300"
          >
            Leave
          </button>
        ) : (
          isActive && (
            <button
              onClick={onJoin}
              className="flex-1 py-2 bg-emerald-600 text-white text-xs rounded-xl hover:bg-emerald-700"
            >
              {challenge.isPublic ? "Join" : "Request to Join"}
            </button>
          )
        )}
      </div>
    </div>
  );
};

// ---------- Modal Component ----------
const Modal = ({
  children,
  onClose,
  size = "md",
}: {
  children: React.ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg";
}) => {
  const sizeClasses = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className={cn(
          "bg-white rounded-2xl w-full max-h-[90vh] overflow-y-auto p-4 shadow-2xl",
          sizeClasses[size],
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};
