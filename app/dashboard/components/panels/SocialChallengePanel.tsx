"use client";

import { useUser } from "@/app/dashboard/hooks/useProfile";
import { useDashboard } from "../../DashboardContext";
import { useChallenges } from "../../hooks/useChallenge";
import { useChallengeMutations } from "../../hooks/useChallengeMutations";
import { ChallengeHeader } from "../subcomponents/socialchallenges/ChallengeHeader";
import { ChallengeStats } from "../subcomponents/socialchallenges/ChallengeStats";
import { ChallengeLeaderboard } from "../subcomponents/socialchallenges/ChallengeLeaderboard";
import { ChallengeToolbar } from "../subcomponents/socialchallenges/ChallengeToolbar";
import { ChallengeSearch } from "../subcomponents/socialchallenges/ChallengeSearch";
import { ChallengeGrid } from "../subcomponents/socialchallenges/ChallengeGrid";
import { CreateChallengeModal } from "../subcomponents/socialchallenges/CreateChallengeModal";
import { JoinCodeModal } from "../subcomponents/socialchallenges/JoinCodeModal";
import { ChallengeDetail } from "../subcomponents/socialchallenges/ChallengeDetail";
import { HelpCarousel } from "../subcomponents/socialchallenges/HelpCarousel";
import { EmptyState } from "../subcomponents/socialchallenges/EmptyState";
import { RequestCard } from "../subcomponents/socialchallenges/RequestCard";
import { FloatingTrophy } from "../subcomponents/socialchallenges/FloatingTrophy";
import { Globe, Users, UserPlus } from "lucide-react";
import { cn } from "@/app/utils/utils";
import { poppins } from "@/app/constants";

export default function SocialChallengesPanel() {
  const { user, isLoading: userLoading } = useUser();
  const { setActivePanel } = useDashboard();

  const {
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
    isLoading,
  } = useChallenges(user);

  const {
    joinCode,
    setJoinCode,
    handleCreateChallenge,
    handleJoin,
    handleJoinByCode,
    handleLeave,
    handleApprove,
    handleProgressUpdate,
    handleAddComment,
  } = useChallengeMutations(user);

  // --- RESPONSIVE MEDICAL SKELETON LOADER ---
  if (userLoading || isLoading) {
    return <ChallengesSkeletonLoader />;
  }

  // --- SAFE FALLBACK STATE ---
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24 min-h-screen pt-12 text-center text-slate-600 font-semibold text-sm">
        We were unable to load your profile information. Please check your
        network connection and try again.
      </div>
    );
  }

  const isCreator = (challenge: any) => challenge.creatorId === user.id;
  const isParticipant = (challenge: any) =>
    challenge.participants && !!challenge.participants[user.id];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* HEADER */}
        <ChallengeHeader onHelp={() => setShowHelp(true)} />

        {/* STATS + LEADERBOARD DISPLAY */}
        <div
          className={cn(
            "grid grid-cols-1 lg:grid-cols-12 gap-6",
            poppins.className,
          )}
        >
          <div className="lg:col-span-8">
            <ChallengeStats
              user={user}
              stats={userStats}
              trophy={<FloatingTrophy />}
            />
          </div>
          <div className="lg:col-span-4">
            <ChallengeLeaderboard
              entries={leaderboard}
              currentUserId={user.id}
            />
          </div>
        </div>

        {/* CONTROLS TOOLBAR */}
        <ChallengeToolbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onCreate={() => setShowCreateModal(true)}
          onJoinCode={() => setShowJoinCodeModal(true)}
          pendingCount={pendingRequests.length}
        />

        {/* SEARCH & FILTERS — Only displayed in Discover array */}
        {activeTab === "discover" && (
          <ChallengeSearch
            search={search}
            onSearchChange={setSearch}
            activity={selectedActivity}
            onActivityChange={setSelectedActivity}
            month={monthFilter}
            onMonthChange={setMonthFilter}
            onReset={() => {
              setSearch("");
              setSelectedActivity("");
              setMonthFilter("all");
            }}
            resultCount={discoverChallenges.length}
          />
        )}

        {/* PENDING ACTIONS INBOX */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            {pendingRequests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingRequests.map((req: any) => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    onApprove={() => handleApprove(req.challengeId, req.userId)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<UserPlus className="w-10 h-10 text-slate-400" />}
                title="No pending group requests"
                description="When friends ask to enter your private health groups, they'll show up here."
              />
            )}
          </div>
        )}

        {/* MAIN INTERACTIVE CHALLENGE TILES */}
        {activeTab !== "requests" && (
          <ChallengeGrid
            challenges={filteredChallenges}
            user={user}
            isCreator={isCreator}
            isParticipant={isParticipant}
            onJoin={handleJoin}
            onView={(challenge) => setSelectedChallenge(challenge)}
            onLeave={handleLeave}
          />
        )}

        {/* EMPTY STATES — Discover Tab */}
        {activeTab === "discover" &&
          filteredChallenges.ongoing.length === 0 &&
          filteredChallenges.ended.length === 0 && (
            <EmptyState
              icon={<Globe className="w-10 h-10 text-slate-400" />}
              title="No health challenges found"
              description="We couldn't find matches. Try adjusting your search keywords, or create a brand new one yourself!"
              action={() => setShowCreateModal(true)}
              actionLabel="Create Challenge"
            />
          )}

        {/* EMPTY STATES — Active Tab */}
        {activeTab === "my" &&
          filteredChallenges.ongoing.length === 0 &&
          filteredChallenges.ended.length === 0 && (
            <EmptyState
              icon={<Users className="w-10 h-10 text-slate-400" />}
              title="You haven't joined any groups yet"
              description="Staying active together is easier! Join an open group challenge or start a private one."
              action={() => setActiveTab("discover")}
              actionLabel="Discover Challenges"
            />
          )}
      </div>

      {/* OVERLAY INTERACTION DIALOGUES */}
      {showCreateModal && (
        <CreateChallengeModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateChallenge}
        />
      )}

      {showJoinCodeModal && (
        <JoinCodeModal
          code={joinCode}
          onCodeChange={setJoinCode}
          onJoin={handleJoinByCode}
          onClose={() => setShowJoinCodeModal(false)}
        />
      )}

      {selectedChallenge && (
        <ChallengeDetail
          challenge={selectedChallenge}
          user={user}
          isCreator={isCreator(selectedChallenge)}
          isParticipant={isParticipant(selectedChallenge)}
          onJoin={() =>
            handleJoin(selectedChallenge.id, selectedChallenge.isPublic)
          }
          onLeave={() => handleLeave(selectedChallenge.id)}
          onProgressUpdate={handleProgressUpdate}
          onAddComment={handleAddComment}
          onClose={() => setSelectedChallenge(null)}
        />
      )}

      {showHelp && <HelpCarousel onClose={() => setShowHelp(false)} />}
    </div>
  );
}

/* --- RESILIENT SHIMMER SKELETON LAYOUT MOCK --- */
function ChallengesSkeletonLoader() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 pt-6 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Header Module Mock */}
        <div className="h-32 bg-white rounded-[32px] border border-slate-200/60" />

        {/* Grid Stats Stack Mock */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-48 bg-white rounded-[32px] border border-slate-200/60" />
          <div className="lg:col-span-4 h-48 bg-white rounded-[32px] border border-slate-200/60" />
        </div>

        {/* Toolbar Tabs Row Mock */}
        <div className="h-16 bg-white rounded-2xl border border-slate-200/60 w-full" />

        {/* Main Feed Challenge Layout Grid Mock */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-[28px] border border-slate-200/60 space-y-4 min-h-[280px]"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-xl bg-slate-200" />
                <div className="h-6 bg-slate-100 rounded-full w-20" />
              </div>
              <div className="space-y-2">
                <div className="h-5 bg-slate-200 rounded-md w-3/4" />
                <div className="h-3 bg-slate-100 rounded-md w-1/2" />
              </div>
              <div className="pt-4 space-y-2">
                <div className="h-2 bg-slate-100 rounded-full w-full" />
                <div className="h-3 bg-slate-200/80 rounded-md w-1/4" />
              </div>
              <div className="pt-4 flex justify-between items-center">
                <div className="w-16 h-4 bg-slate-100 rounded" />
                <div className="w-24 h-10 bg-slate-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
