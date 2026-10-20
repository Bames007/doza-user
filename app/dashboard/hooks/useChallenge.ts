"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { authFetcher } from "@/app/utils/client-auth";
import { badges } from "@/app/types/challengeConstant";
import type { Challenge } from "@/app/types/challengetype";
import type { UserInfo } from "@/app/dashboard/hooks/useProfile";

// ─── sessionStorage helpers ─────────────────────────────
function ssGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function ssSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, value);
  } catch {}
}

const SWR_CHALLENGE_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60_000,
  keepPreviousData: true,
  revalidateIfStale: false,
  errorRetryCount: 1,
} as const;

type ChallengeTab = "my" | "discover" | "requests";
const VALID_TABS: ChallengeTab[] = ["my", "discover", "requests"];

export function useChallenges(user: UserInfo | null) {
  // ─── Persisted: activeTab ─────────────────────────────
  const [activeTab, setActiveTab] = useState<ChallengeTab>(() => {
    const v = ssGet("challenges:activeTab");
    return VALID_TABS.includes(v as ChallengeTab)
      ? (v as ChallengeTab)
      : "discover";
  });
  useEffect(() => {
    ssSet("challenges:activeTab", activeTab);
  }, [activeTab]);

  // ─── Persisted: selectedActivity ──────────────────────
  const [selectedActivity, setSelectedActivity] = useState<string>(
    () => ssGet("challenges:activity") || "",
  );
  useEffect(() => {
    ssSet("challenges:activity", selectedActivity);
  }, [selectedActivity]);

  // ─── Persisted: monthFilter ───────────────────────────
  const [monthFilter, setMonthFilter] = useState<string>(
    () => ssGet("challenges:month") || "all",
  );
  useEffect(() => {
    ssSet("challenges:month", monthFilter);
  }, [monthFilter]);

  // ─── Ephemeral ────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(
    null,
  );

  // NOTE: debounce was removed. The panel input debounces; adding a second
  // debounce here created 650ms latency. Use `search` directly.

  const { data: myChallengesData, isLoading: myLoading } = useSWR(
    "/api/challenges?type=my",
    authFetcher,
    SWR_CHALLENGE_CONFIG,
  );

  const { data: discoverFilteredData, isLoading: discoverLoading } = useSWR(
    `/api/challenges?search=${encodeURIComponent(search)}&activity=${selectedActivity}&visibility=public`,
    authFetcher,
    SWR_CHALLENGE_CONFIG,
  );

  const { data: requestsData, isLoading: requestsLoading } = useSWR(
    "/api/challenges/requests",
    authFetcher,
    SWR_CHALLENGE_CONFIG,
  );

  // ─── Derived data ─────────────────────────────────────
  const myChallenges: Challenge[] = myChallengesData?.success
    ? myChallengesData.data.filter(
        (c: Challenge) =>
          c.creatorId === user?.id ||
          (c.participants && c.participants[user?.id || ""]),
      )
    : [];

  const discoverChallenges: Challenge[] = discoverFilteredData?.success
    ? discoverFilteredData.data
    : [];

  const pendingRequests: any[] = requestsData?.success ? requestsData.data : [];

  // Stable `now` — computed once per mount. Ongoing/ended classification
  // only needs to be correct when the panel opens.
  const now = useMemo(() => new Date(), []);

  const filteredChallenges = useMemo(() => {
    let source: Challenge[] = [];

    if (activeTab === "discover") {
      source = discoverChallenges;
    } else if (activeTab === "my") {
      source = myChallenges;
    } else {
      return { ongoing: [], ended: [] };
    }

    let filtered = [...source];

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

  const userStats = useMemo(() => {
    if (!user)
      return {
        joined: 0,
        created: 0,
        ongoing: 0,
        points: 0,
        badges: [] as string[],
      };

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

    if (user) {
      userMap.set(user.id, {
        uid: user.id,
        name: user.fullName || "You",
        photo: user.avatar || undefined,
        totalPoints: 0,
      });
    }

    const allForLeaderboard = [...discoverChallenges, ...myChallenges];
    const seen = new Set<string>();
    const unique = allForLeaderboard.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    unique.forEach((challenge) => {
      Object.entries(challenge.participants || {}).forEach(([uid, p]) => {
        const progress = typeof p.progress === "number" ? p.progress : 0;
        const points = progress * 10;
        const existing = userMap.get(uid);
        if (existing) {
          existing.totalPoints += points;
        } else {
          userMap.set(uid, {
            uid,
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
  }, [discoverChallenges, myChallenges, user]);

  return {
    activeTab,
    setActiveTab,
    search,
    setSearch,
    selectedActivity,
    setSelectedActivity,
    monthFilter,
    setMonthFilter,
    showCreateModal,
    setShowCreateModal,
    showJoinCodeModal,
    setShowJoinCodeModal,
    showHelp,
    setShowHelp,
    selectedChallenge,
    setSelectedChallenge,
    myChallenges,
    discoverChallenges,
    pendingRequests,
    filteredChallenges,
    userStats,
    leaderboard,
    isLoading: myLoading || discoverLoading || requestsLoading,
  };
}
