"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { authFetcher } from "@/app/utils/client-auth";
import { badges } from "@/app/types/challengeConstant";
import type { Challenge } from "@/app/types/challengetype";
import type { UserInfo } from "@/app/dashboard/hooks/useProfile";

export function useChallenges(user: UserInfo | null) {
  const [activeTab, setActiveTab] = useState<"my" | "discover" | "requests">(
    "discover",
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(
    null,
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!search) setDebouncedSearch("");
  }, [search]);

  // ALWAYS fetch my challenges
  const { data: myChallengesData, isLoading: myLoading } = useSWR(
    "/api/challenges?type=my",
    authFetcher,
    { revalidateOnFocus: false, errorRetryCount: 1 },
  );

  // ALWAYS fetch discover challenges
  const { data: discoverFilteredData, isLoading: discoverLoading } = useSWR(
    `/api/challenges?search=${encodeURIComponent(debouncedSearch)}&activity=${selectedActivity}&visibility=public`,
    authFetcher,
    { revalidateOnFocus: false, errorRetryCount: 1, keepPreviousData: true },
  );

  // ALWAYS fetch requests (lightweight — only fires if user has created challenges)
  const { data: requestsData, isLoading: requestsLoading } = useSWR(
    "/api/challenges/requests",
    authFetcher,
    { revalidateOnFocus: false, errorRetryCount: 1 },
  );

  // My challenges (where user is creator OR participant)
  const myChallenges: Challenge[] = myChallengesData?.success
    ? myChallengesData.data.filter(
        (c: Challenge) =>
          c.creatorId === user?.id ||
          (c.participants && c.participants[user?.id || ""]),
      )
    : [];

  // All discover challenges
  const discoverChallenges: Challenge[] = discoverFilteredData?.success
    ? discoverFilteredData.data
    : [];

  // Pending requests (for inbox)
  const pendingRequests: any[] = requestsData?.success ? requestsData.data : [];

  const now = new Date();

  // FILTERED CHALLENGES — what shows in the grid based on active tab
  const filteredChallenges = useMemo(() => {
    let source: Challenge[] = [];

    if (activeTab === "discover") {
      // Show ALL public challenges
      source = discoverChallenges;
    } else if (activeTab === "my") {
      // Show user's challenges
      source = myChallenges;
    } else {
      // Inbox — no challenge grid
      return { ongoing: [], ended: [] };
    }

    let filtered = [...source];

    // Month filter (applies to both discover and my)
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

  // USER STATS — always from myChallenges
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

  // LEADERBOARD — from all discover + my challenges
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
