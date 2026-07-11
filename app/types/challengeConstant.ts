import { Medal, Award, Star, Sparkles } from "lucide-react";

export const activityOptions = [
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

export const badges = [
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

export const unsplashImages = [
  "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400",
  "https://images.unsplash.com/photo-1571008887538-b36bb32f1bc6?w=400",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400",
  "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=400",
  "https://images.unsplash.com/photo-1554284126-aa88f22d8b74?w=400",
  "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400",
];

export const helpSlides = [
  {
    icon: "🏆",
    title: "Create Challenges",
    description:
      "Start a workout challenge – set a goal, invite friends, and track progress together.",
  },
  {
    icon: "🌍",
    title: "Discover Public Challenges",
    description:
      "Find global challenges or search by name. Join and compete with others.",
  },
  {
    icon: "🔒",
    title: "Private Challenges",
    description:
      "Create invite‑only challenges. Share a code so only selected friends can join.",
  },
  {
    icon: "📈",
    title: "Real‑time Progress",
    description:
      "Log your daily progress and see how you stack up against others on the leaderboard.",
  },
  {
    icon: "🏅",
    title: "Earn Badges & Points",
    description:
      "Complete challenges to earn points and unlock beautiful badges. Share your achievements!",
  },
];
