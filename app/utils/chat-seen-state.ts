// app/utils/chat-seen-state.ts
const STORAGE_KEY = "doza_patient_last_seen_messages";

// ── Which chat is currently open (only one at a time) ───
let currentOpenChatId: string | null = null;
const openListeners = new Set<(id: string | null) => void>();

export function setOpenChatId(id: string | null) {
  currentOpenChatId = id;
  openListeners.forEach((fn) => fn(id));
}

export function getOpenChatId() {
  return currentOpenChatId;
}

export function subscribeOpenChat(fn: (id: string | null) => void) {
  openListeners.add(fn);
  return () => {
    openListeners.delete(fn);
  };
}

// ── Per-appointment "last seen message timestamp" ────────
export function loadSeen(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveSeen(map: Record<string, number>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export function markChatSeen(appointmentId: string, at: number) {
  if (!appointmentId || !at) return;
  const map = loadSeen();
  map[appointmentId] = Math.max(map[appointmentId] ?? 0, at);
  saveSeen(map);
}

// ── Back-button guard (chat takes precedence over useBackGuard) ──
// A counter so multiple overlapping overlays are handled (only one chat
// can be open at a time today, but this stays correct if that changes).
let chatBackGuardCount = 0;

export function pushChatBackGuard(): void {
  chatBackGuardCount++;
}

export function popChatBackGuard(): void {
  chatBackGuardCount = Math.max(0, chatBackGuardCount - 1);
}

export function isChatBackGuarded(): boolean {
  return chatBackGuardCount > 0;
}
