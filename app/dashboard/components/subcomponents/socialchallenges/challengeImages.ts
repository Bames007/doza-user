// app/types/challengeImages.ts
export const ACTIVITY_IMAGES: Record<string, string> = {
  running:
    "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1400&q=80&auto=format&fit=crop",
  jogging:
    "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1400&q=80&auto=format&fit=crop",
  walk: "https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?w=1400&q=80&auto=format&fit=crop",
  walking:
    "https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?w=1400&q=80&auto=format&fit=crop",
  cycling:
    "https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=1400&q=80&auto=format&fit=crop",
  bike: "https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=1400&q=80&auto=format&fit=crop",
  swimming:
    "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1400&q=80&auto=format&fit=crop",
  pushups:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=80&auto=format&fit=crop",
  situps:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=80&auto=format&fit=crop",
  squats:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=80&auto=format&fit=crop",
  pullups:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=80&auto=format&fit=crop",
  gym: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=80&auto=format&fit=crop",
  yoga: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1400&q=80&auto=format&fit=crop",
  meditation:
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1400&q=80&auto=format&fit=crop",
  hiking:
    "https://images.unsplash.com/photo-1551632811-561732d1e306?w=1400&q=80&auto=format&fit=crop",
  steps:
    "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=1400&q=80&auto=format&fit=crop",
  water:
    "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=1400&q=80&auto=format&fit=crop",
  sleep:
    "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=1400&q=80&auto=format&fit=crop",
};

const DEFAULT_HERO =
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1400&q=80&auto=format&fit=crop";

export function getChallengeImage(challenge: {
  imageUrl?: string;
  activity?: string;
}): string {
  if (challenge.imageUrl && challenge.imageUrl.trim())
    return challenge.imageUrl;
  const key = (challenge.activity || "").toLowerCase().trim();
  return ACTIVITY_IMAGES[key] || DEFAULT_HERO;
}
