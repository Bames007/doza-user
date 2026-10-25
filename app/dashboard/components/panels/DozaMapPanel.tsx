// app/dashboard/panels/DozaMapPanel.tsx
"use client";

import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import {
  APIProvider,
  Map,
  Marker,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Search,
  Phone,
  MapPin,
  Clock,
  Maximize2,
  Minimize2,
  HelpCircle,
  Stethoscope,
  Pill,
  FlaskConical,
  Navigation,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  X,
  AlertTriangle,
  Star,
  Calendar,
  Info,
  ShoppingCart,
  Beaker,
  Check,
  Truck,
  Store,
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import { useUserLocation } from "../../hooks/useUserLocation";
import { useCenterSearch } from "../../hooks/useCenterSearch";
import { poppins } from "@/app/constants";
import { useDashboard } from "../../DashboardContext";
import { useUser } from "../../hooks/useProfile";
import { mutate } from "swr";
import DatePicker from "@/app/components/CustomDatePicker";

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
function ssRemove(key: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

// ---------- Types ----------
interface SearchResult {
  centerId: string;
  centerName: string;
  centerType: string;
  location: { lat: number; lng: number };
  address: string;
  phone: string;
  email: string;
  operatingHours: {
    days: string[];
    opening: string;
    closing: string;
  } | null;
  distance: number;
  matches: MatchItem[];
  isBeyondRange?: boolean;
  ratings?: {
    average: number;
    count: number;
    comments: Array<{
      userId: string;
      userName: string;
      rating: number;
      comment: string;
      timestamp: number;
    }>;
  } | null;
}

interface MatchItem {
  id: string;
  name: string;
  price: number;
  description: string;
  type: string;
  unit?: string;
  prescriptionRequired?: boolean;
}

// ---------- Constants ----------
const DEFAULT_CENTER = { lat: 6.5244, lng: 3.3792 };
const RETAIL_MARKUP_PERCENT = 15;
const BIG_RADIUS = 99999;
const VALID_DISTANCES = [5, 10, 20, 50, 100, 200, 500];

const searchTabs = [
  {
    id: "service",
    label: "Checkups",
    fullLabel: "Checkups & Care",
    icon: Stethoscope,
  },
  { id: "drug", label: "Medicines", fullLabel: "Medicines", icon: Pill },
  {
    id: "test",
    label: "Lab Tests",
    fullLabel: "Lab Tests",
    icon: FlaskConical,
  },
] as const;

type SearchType = (typeof searchTabs)[number]["id"];

const helpSlides = [
  {
    icon: <Search className="w-6 h-6" />,
    title: "1. Search for care",
    description:
      "Type any drug name, medical checkup, or lab test you need. We'll search local inventories automatically.",
  },
  {
    icon: <Navigation className="w-6 h-6" />,
    title: "2. Set your distance",
    description:
      "Choose how far you are willing to travel. We rank options by proximity to save you a long journey.",
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: "3. Check availability",
    description:
      "See verified pricing, check if the clinic is open right now, and phone them directly before leaving home.",
  },
];

// ---------- Helpers ----------
function getStatusLabel(hours?: any): { label: string; classes: string } {
  if (!hours?.opening || !hours?.closing || !hours?.days) {
    return {
      label: "Hours Unverified",
      classes: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    };
  }
  const now = new Date();
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  if (!hours.days.includes(days[now.getDay()])) {
    return {
      label: "Closed Today",
      classes: "bg-rose-50 text-rose-700 border border-rose-200",
    };
  }
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [oH, oM] = hours.opening.split(":").map(Number);
  const [cH, cM] = hours.closing.split(":").map(Number);
  const isOpen =
    currentMinutes >= oH * 60 + oM && currentMinutes <= cH * 60 + cM;
  return isOpen
    ? {
        label: "Open Now",
        classes: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      }
    : {
        label: "Closed",
        classes: "bg-rose-50 text-rose-700 border border-rose-200",
      };
}

// ═════════════════════════════════════════════════════════════
//  SEARCH INPUT — unchanged behavior, emerald focus
// ═════════════════════════════════════════════════════════════
const SearchInput = memo(function SearchInput({
  initialValue,
  onDebouncedChange,
  placeholder,
  isLoading,
}: {
  initialValue: string;
  onDebouncedChange: (v: string) => void;
  placeholder: string;
  isLoading: boolean;
}) {
  const [localValue, setLocalValue] = useState(initialValue);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSyncedRef = useRef(initialValue);

  useEffect(() => {
    if (initialValue !== lastSyncedRef.current) {
      lastSyncedRef.current = initialValue;
      setLocalValue(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocalValue(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastSyncedRef.current = v;
      onDebouncedChange(v);
    }, 250);
  };

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLocalValue("");
    lastSyncedRef.current = "";
    onDebouncedChange("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none">
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Search className="w-5 h-5" />
        )}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="search"
        className="w-full h-12 md:h-14 pl-12 pr-12 bg-emerald-50/50 border-2 border-emerald-100 rounded-xl md:rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 text-emerald-900 font-medium text-base sm:text-sm md:text-base transition-colors outline-none placeholder:text-emerald-700/40"
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors",
            FOCUS,
          )}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});

// ---------- Skeletons ----------
function SkeletonResultCard() {
  return (
    <div className="p-4 rounded-2xl border border-emerald-100 bg-white space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-2/3 bg-emerald-200 rounded-md" />
          <div className="h-2.5 w-1/3 bg-emerald-100 rounded-md" />
        </div>
      </div>
      <div className="h-px bg-emerald-50" />
      <div className="flex justify-between items-center">
        <div className="h-3 w-16 bg-emerald-100 rounded-md" />
        <div className="h-4 w-20 bg-emerald-200 rounded-md" />
      </div>
    </div>
  );
}

function SkeletonSidebar() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <SkeletonResultCard key={i} />
      ))}
    </div>
  );
}

function SkeletonMap() {
  return (
    <div className="w-full h-full bg-emerald-50 flex items-center justify-center p-6 text-center">
      <div className="space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
        <p className="text-xs font-semibold text-emerald-700 tracking-wide uppercase">
          Mapping Health Centers…
        </p>
      </div>
    </div>
  );
}

// ---------- Main Component ----------
const DozaMapPanel = memo(function DozaMapPanel() {
  const { location: userLocation, loading: locationLoading } =
    useUserLocation();
  const { setActivePanel } = useDashboard();
  const { user } = useUser();

  // ─── Persisted state ───────────────────────────────
  const [searchQuery, setSearchQuery] = useState<string>(
    () => ssGet("dmap:searchQuery") || "",
  );
  useEffect(() => {
    if (searchQuery) ssSet("dmap:searchQuery", searchQuery);
    else ssRemove("dmap:searchQuery");
  }, [searchQuery]);

  const [searchType, setSearchType] = useState<SearchType>(() => {
    const v = ssGet("dmap:searchType");
    if (v === "service" || v === "drug" || v === "test") return v;
    return "service";
  });
  useEffect(() => {
    ssSet("dmap:searchType", searchType);
  }, [searchType]);

  const [maxDistance, setMaxDistance] = useState<number>(() => {
    const v = ssGet("dmap:maxDistance");
    const n = v ? Number(v) : NaN;
    return VALID_DISTANCES.includes(n) ? n : 50;
  });
  useEffect(() => {
    ssSet("dmap:maxDistance", String(maxDistance));
  }, [maxDistance]);

  const [showOpenNow, setShowOpenNow] = useState<boolean>(
    () => ssGet("dmap:showOpenNow") === "true",
  );
  useEffect(() => {
    ssSet("dmap:showOpenNow", String(showOpenNow));
  }, [showOpenNow]);

  const [showBeyondRange, setShowBeyondRange] = useState<boolean>(
    () => ssGet("dmap:showBeyondRange") === "true",
  );
  useEffect(() => {
    ssSet("dmap:showBeyondRange", String(showBeyondRange));
  }, [showBeyondRange]);

  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(
    () => ssGet("dmap:isSidebarExpanded") !== "false",
  );
  useEffect(() => {
    ssSet("dmap:isSidebarExpanded", String(isSidebarExpanded));
  }, [isSidebarExpanded]);

  const [isFullscreenMap, setIsFullscreenMap] = useState<boolean>(
    () => ssGet("dmap:isFullscreenMap") === "true",
  );
  useEffect(() => {
    ssSet("dmap:isFullscreenMap", String(isFullscreenMap));
  }, [isFullscreenMap]);

  // ─── Handoff consumer ─────────────────────────────
  useEffect(() => {
    const consumeHandoff = () => {
      const raw = sessionStorage.getItem("doza_map_handoff_v1");
      if (!raw) return;
      try {
        const { q, type, ts } = JSON.parse(raw);
        if (Date.now() - ts > 60_000) {
          sessionStorage.removeItem("doza_map_handoff_v1");
          return;
        }
        if (q) setSearchQuery(q);
        if (type === "service" || type === "drug" || type === "test") {
          setSearchType(type);
        }
        sessionStorage.removeItem("doza_map_handoff_v1");
      } catch {
        sessionStorage.removeItem("doza_map_handoff_v1");
      }
    };
    consumeHandoff();
    window.addEventListener("doza-map-handoff", consumeHandoff);
    return () => window.removeEventListener("doza-map-handoff", consumeHandoff);
  }, []);

  // ─── Scroll restoration ────────────────────────────
  const scrollRestoredRef = useRef(false);
  useEffect(() => {
    const el =
      (document.getElementById("dashboard-scroll") as HTMLElement | null) ||
      (document.querySelector("main") as HTMLElement | null);
    if (!el) return;

    if (!scrollRestoredRef.current) {
      const saved = ssGet("dmap:scroll");
      el.scrollTo({ top: saved ? Number(saved) : 0, behavior: "instant" });
      scrollRestoredRef.current = true;
    }

    const onScroll = () => ssSet("dmap:scroll", String(el.scrollTop));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // ─── Location debounce ─────────────────────────────
  const [debouncedLocation, setDebouncedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(() => userLocation || null);
  const locationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (userLocation) {
      if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
      if (!debouncedLocation) {
        setDebouncedLocation(userLocation);
        return;
      }
      locationTimeoutRef.current = setTimeout(() => {
        if (
          getDistance(
            debouncedLocation.lat,
            debouncedLocation.lng,
            userLocation.lat,
            userLocation.lng,
          ) > 0.5
        ) {
          setDebouncedLocation(userLocation);
        }
      }, 500);
      return () => {
        if (locationTimeoutRef.current)
          clearTimeout(locationTimeoutRef.current);
      };
    } else if (!locationLoading) {
      setDebouncedLocation(DEFAULT_CENTER);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, locationLoading]);

  function getDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const toRad = (val: number) => (val * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // ─── Ephemeral state ───────────────────────────────
  const [mapCenter, setMapCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SearchResult | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [helpSlide, setHelpSlide] = useState(0);
  const [distanceOpen, setDistanceOpen] = useState(false);
  const distanceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        distanceDropdownRef.current &&
        !distanceDropdownRef.current.contains(event.target as Node)
      ) {
        setDistanceOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Action Modal State
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedCenterForAction, setSelectedCenterForAction] =
    useState<SearchResult | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);
  const [actionDate, setActionDate] = useState("");
  const [actionTime, setActionTime] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<
    "pickup" | "delivery"
  >("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  // ─── Data ──────────────────────────────────────────
  const { results, isLoading, error } = useCenterSearch(
    searchQuery,
    searchType,
    BIG_RADIUS,
    debouncedLocation,
  );

  const { withinRange, beyondRange } = useMemo(() => {
    const within: SearchResult[] = [];
    const beyond: SearchResult[] = [];
    (results || []).forEach((result: SearchResult) => {
      if (result.distance <= maxDistance) within.push(result);
      else beyond.push({ ...result, isBeyondRange: true });
    });
    return { withinRange: within, beyondRange: beyond };
  }, [results, maxDistance]);

  const filteredResults = useMemo(() => {
    let res = [...withinRange];
    if (showBeyondRange) res = [...res, ...beyondRange];
    if (showOpenNow) {
      res = res.filter(
        (r: SearchResult) =>
          getStatusLabel(r.operatingHours).label === "Open Now",
      );
    }
    return res.sort((a, b) => a.distance - b.distance);
  }, [withinRange, beyondRange, showOpenNow, showBeyondRange]);

  useEffect(() => {
    if (debouncedLocation) setMapCenter(debouncedLocation);
    else if (!locationLoading) setMapCenter(DEFAULT_CENTER);
  }, [debouncedLocation, locationLoading]);

  const handleDebouncedQueryChange = useCallback((v: string) => {
    setSearchQuery(v);
  }, []);

  // ─── Actions ───────────────────────────────────────
  const handleAction = (center: SearchResult, match?: MatchItem) => {
    setSelectedCenterForAction(center);
    const selected = match || center.matches?.[0] || null;
    setSelectedMatch(selected);
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const roundedMinutes = Math.ceil(now.getMinutes() / 30) * 30;
    now.setMinutes(roundedMinutes);
    setActionDate(now.toISOString().split("T")[0]);
    setActionTime("");
    setActionNotes("");
    setActionError("");
    setFulfillmentMethod("pickup");
    setDeliveryAddress("");
    setShowActionModal(true);
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      setActionError("You must be logged in to perform this action.");
      return;
    }
    if (!selectedCenterForAction) return;

    const actionType = searchType;
    if (actionType === "service" && (!actionDate || !actionTime)) {
      setActionError("Please select a date and time for the appointment.");
      return;
    }
    if (
      actionType === "drug" &&
      fulfillmentMethod === "delivery" &&
      !deliveryAddress.trim()
    ) {
      setActionError("Please enter your delivery address.");
      return;
    }

    setActionSubmitting(true);
    setActionError("");

    try {
      const endpoint = `/api/centers/${selectedCenterForAction.centerId}/doza-requests`;
      let payload: any = { centerId: selectedCenterForAction.centerId };

      if (actionType === "service") {
        payload = {
          ...payload,
          patientName: user.fullName || "User",
          patientPhone: user.profile?.phone || "",
          patientEmail: user.email || "",
          dozaUserId: user.id,
          type: "consultation",
          startTime: new Date(`${actionDate}T${actionTime}`).toISOString(),
          endTime: new Date(
            new Date(`${actionDate}T${actionTime}`).getTime() + 30 * 60000,
          ).toISOString(),
          notes: actionNotes || "General consultation",
        };
      } else if (actionType === "drug") {
        payload = {
          ...payload,
          patientName: user.fullName || "User",
          patientPhone: user.profile?.phone || "",
          patientEmail: user.email || "",
          dozaUserId: user.id,
          type: "prescription",
          medication: selectedMatch?.name,
          dosage: selectedMatch?.unit || "",
          quantity: 1,
          notes: actionNotes || `Request for ${selectedMatch?.name}`,
          fulfillmentMethod,
        };
        if (fulfillmentMethod === "delivery")
          payload.deliveryAddress = deliveryAddress;
      } else if (actionType === "test") {
        payload = {
          ...payload,
          patientName: user.fullName || "User",
          patientPhone: user.profile?.phone || "",
          patientEmail: user.email || "",
          dozaUserId: user.id,
          type: "test",
          testName: selectedMatch?.name,
          notes: actionNotes || `Request for ${selectedMatch?.name}`,
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user.id },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(
          `Server returned ${res.status}: ${text.substring(0, 100)}`,
        );
      }
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        setShowActionModal(false);
        setSelectedCenterForAction(null);
        setSelectedMatch(null);
        window.dispatchEvent(new Event("doza-request-created"));
        if (actionType === "service") {
          mutate("/api/appointments");
          alert(
            `Appointment booked successfully at ${selectedCenterForAction.centerName}!`,
          );
        } else if (actionType === "drug") {
          alert(
            `Medication order placed at ${selectedCenterForAction.centerName}.`,
          );
        } else {
          alert(`Test request sent to ${selectedCenterForAction.centerName}.`);
        }
      } else {
        setActionError(data.error || "Action failed.");
      }
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Network error. Please try again.");
    } finally {
      setActionSubmitting(false);
    }
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedCenterForAction(null);
    setSelectedMatch(null);
    setActionError("");
  };

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const isColdStart =
    (!debouncedLocation || isLoading) && filteredResults.length === 0;

  const actionLabel =
    searchType === "service"
      ? "Book Appointment"
      : searchType === "drug"
        ? "Order Now"
        : "Request Test";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "min-h-screen flex flex-col bg-[#F8FAFC] antialiased",
        poppins.className,
      )}
    >
      {/* ─── HEADER ──────────────────────────────────────── */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 lg:pt-4 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              Medical Locator
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg">
              Search checkups, medicines, and lab tests at health centers near
              you.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setHelpSlide(0);
              setShowHelp(true);
            }}
            aria-label="Help"
            className={cn(
              "shrink-0 min-h-11 px-4 rounded-xl bg-white border border-emerald-200 hover:bg-emerald-50 inline-flex items-center justify-center gap-2 transition-colors shadow-xs text-emerald-700",
              FOCUS,
            )}
          >
            <HelpCircle size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">
              Help
            </span>
          </button>
        </div>
      </header>

      {/* ─── SEARCH SECTION ──────────────────────────────── */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3">
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-xs p-3 sm:p-4 space-y-2.5">
          {/* Search input */}
          <SearchInput
            initialValue={searchQuery}
            onDebouncedChange={handleDebouncedQueryChange}
            placeholder={
              searchType === "service"
                ? "Search checkups, consultations, surgeries…"
                : searchType === "drug"
                  ? "Search tablets, syrups, insulin generics…"
                  : "Search blood tests, scans, x-rays…"
            }
            isLoading={isLoading}
          />

          {/* Tabs + Filters */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            {/* Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-emerald-50 p-1 rounded-xl shrink-0 md:w-auto">
              {searchTabs.map((tab) => {
                const TabIcon = tab.icon;
                const isSelected = searchType === tab.id;
                const count =
                  isSelected && !isLoading ? filteredResults.length : 0;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSearchType(tab.id)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 min-h-10 px-2 sm:px-3 rounded-lg text-xs font-semibold transition-colors",
                      isSelected
                        ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                        : "text-emerald-700/80 hover:bg-white hover:text-emerald-800",
                      FOCUS,
                    )}
                  >
                    <TabIcon
                      className={cn(
                        "w-3.5 h-3.5 shrink-0",
                        isSelected ? "text-white" : "text-emerald-600",
                      )}
                    />
                    <span className="hidden sm:inline truncate">
                      {tab.fullLabel}
                    </span>
                    <span className="sm:hidden truncate">{tab.label}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          "ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full",
                          isSelected
                            ? "bg-white/25 text-white"
                            : "bg-emerald-100 text-emerald-800",
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-1.5 md:ml-auto shrink-0">
              {/* Distance dropdown */}
              <div
                className="relative flex-1 md:flex-none"
                ref={distanceDropdownRef}
              >
                <button
                  type="button"
                  onClick={() => setDistanceOpen(!distanceOpen)}
                  aria-haspopup="listbox"
                  aria-expanded={distanceOpen}
                  className={cn(
                    "w-full md:w-auto min-h-10 flex items-center justify-center md:justify-start gap-2 px-3 rounded-xl border transition-colors",
                    distanceOpen
                      ? "bg-white border-emerald-500 ring-2 ring-emerald-500/15"
                      : "bg-white border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50",
                    FOCUS,
                  )}
                >
                  <Navigation className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-semibold text-emerald-900 whitespace-nowrap">
                    {maxDistance} km
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 text-emerald-600 transition-transform shrink-0",
                      distanceOpen && "rotate-180",
                    )}
                  />
                </button>

                <AnimatePresence>
                  {distanceOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 6, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      role="listbox"
                      className="absolute left-0 top-full mt-2 w-48 bg-white border border-emerald-100 rounded-xl shadow-lg p-1.5 z-50 custom-emerald-scrollbar max-h-64 overflow-y-auto"
                    >
                      {VALID_DISTANCES.map((km) => {
                        const isSelected = km === maxDistance;
                        return (
                          <button
                            key={km}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setMaxDistance(km);
                              setDistanceOpen(false);
                            }}
                            className={cn(
                              "w-full min-h-10 flex items-center justify-between px-3 rounded-lg text-sm font-medium transition-colors",
                              isSelected
                                ? "bg-emerald-600 text-white"
                                : "text-emerald-800 hover:bg-emerald-50",
                              FOCUS,
                            )}
                          >
                            <span>Within {km} km</span>
                            {isSelected && (
                              <Check className="w-4 h-4 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Open Now toggle */}
              <button
                onClick={() => setShowOpenNow(!showOpenNow)}
                className={cn(
                  "min-h-10 px-3 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap",
                  showOpenNow
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50",
                  FOCUS,
                )}
              >
                Open Now
              </button>

              {/* Beyond toggle — keeps amber because it's a warning opt-in */}
              <button
                onClick={() => setShowBeyondRange(!showBeyondRange)}
                className={cn(
                  "min-h-10 px-3 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 whitespace-nowrap",
                  showBeyondRange
                    ? "bg-amber-600 border-amber-600 text-white"
                    : "bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50",
                  FOCUS,
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Beyond</span>
                <span>{maxDistance}km</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MAP + RESULTS ───────────────────────────────── */}
      <main className="flex-1 flex flex-col md:flex-row gap-3 sm:gap-4 px-4 sm:px-6 lg:px-8 pb-4 max-w-7xl w-full mx-auto min-h-0 overflow-hidden relative">
        <aside
          className={cn(
            "bg-white rounded-2xl border border-emerald-100 shadow-xs transition-all duration-300 z-20 flex flex-col shrink-0 overflow-hidden",
            isFullscreenMap
              ? "hidden md:flex md:w-[380px]"
              : "w-full md:w-[380px]",
            isSidebarExpanded ? "h-[45vh] md:h-auto flex-1" : "h-14 md:h-auto",
          )}
        >
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 768)
                setIsSidebarExpanded(!isSidebarExpanded);
            }}
            className={cn(
              "px-4 py-3 border-b border-emerald-100 flex items-center justify-between text-left md:cursor-default min-h-14 bg-emerald-50/60",
              FOCUS,
            )}
          >
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-emerald-900 tracking-tight">
                Search results
              </h3>
              <p className="text-[11px] font-semibold text-emerald-700/70 mt-0.5">
                {isColdStart
                  ? "Searching…"
                  : `${filteredResults.length} ${filteredResults.length === 1 ? "result" : "results"}`}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="hidden sm:flex gap-1">
                {withinRange.length > 0 && (
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    {withinRange.length} nearby
                  </span>
                )}
                {showBeyondRange && beyondRange.length > 0 && (
                  <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    {beyondRange.length} beyond
                  </span>
                )}
              </div>
              <div className="md:hidden min-h-8 min-w-8 inline-flex items-center justify-center text-emerald-600">
                {isSidebarExpanded ? (
                  <ChevronDown size={18} />
                ) : (
                  <ChevronUp size={18} />
                )}
              </div>
            </div>
          </button>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-emerald-50/30 custom-emerald-scrollbar">
            {isColdStart ? (
              <SkeletonSidebar />
            ) : error ? (
              <div
                role="alert"
                className="p-4 text-center text-rose-800 text-xs font-semibold bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Could not load search results. Please check your connection.
                </span>
              </div>
            ) : filteredResults.length === 0 ? (
              <EmptyState
                searchQuery={searchQuery}
                searchType={searchType}
                maxDistance={maxDistance}
                showBeyondRange={showBeyondRange}
              />
            ) : (
              filteredResults.map((result: SearchResult) => (
                <ResultCard
                  key={result.centerId}
                  result={result}
                  isActive={selectedPlace?.centerId === result.centerId}
                  maxDistance={maxDistance}
                  onClick={() => {
                    setSelectedPlace(result);
                    setMapCenter(result.location);
                    setIsFullscreenMap(false);
                    if (window.innerWidth < 768) setIsSidebarExpanded(false);
                  }}
                  onAction={(match?: MatchItem) => handleAction(result, match)}
                  onFocusMap={() => {
                    setMapCenter(result.location);
                    setSelectedPlace(result);
                    if (window.innerWidth < 768) setIsSidebarExpanded(false);
                  }}
                  actionLabel={actionLabel}
                />
              ))
            )}
          </div>
        </aside>

        <section className="flex-1 min-h-[45vh] md:min-h-0 relative rounded-2xl overflow-hidden border border-emerald-100 shadow-xs bg-emerald-50">
          {!apiKey || !mapCenter ? (
            <SkeletonMap />
          ) : (
            <APIProvider apiKey={apiKey}>
              <Map
                defaultCenter={mapCenter}
                center={mapCenter}
                defaultZoom={13}
                zoom={13}
                disableDefaultUI
                gestureHandling="greedy"
                className="w-full h-full"
              >
                {withinRange.map((result: SearchResult) => (
                  <Marker
                    key={result.centerId}
                    position={result.location}
                    onClick={() => {
                      setSelectedPlace(result);
                      if (window.innerWidth < 768) setIsSidebarExpanded(false);
                    }}
                  />
                ))}
                {showBeyondRange &&
                  beyondRange.map((result: SearchResult) => (
                    <Marker
                      key={result.centerId}
                      position={result.location}
                      onClick={() => {
                        setSelectedPlace(result);
                        if (window.innerWidth < 768)
                          setIsSidebarExpanded(false);
                      }}
                    />
                  ))}
                {selectedPlace && (
                  <InfoWindow
                    position={selectedPlace.location}
                    onCloseClick={() => setSelectedPlace(null)}
                    pixelOffset={[0, -35]}
                  >
                    <InfoWindowContent
                      place={selectedPlace}
                      maxDistance={maxDistance}
                      onAction={(match?: MatchItem) =>
                        handleAction(selectedPlace, match)
                      }
                      actionLabel={actionLabel}
                    />
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          )}

          <button
            onClick={() => setIsFullscreenMap(!isFullscreenMap)}
            aria-label={
              isFullscreenMap ? "Exit fullscreen map" : "Fullscreen map"
            }
            className={cn(
              "absolute bottom-4 right-4 min-h-11 min-w-11 inline-flex items-center justify-center bg-emerald-600 text-white rounded-xl shadow-lg z-10 hover:bg-emerald-700 active:scale-95 transition-all hidden md:flex",
              FOCUS,
            )}
          >
            {isFullscreenMap ? (
              <Minimize2 size={18} />
            ) : (
              <Maximize2 size={18} />
            )}
          </button>

          {(withinRange.length > 0 ||
            (showBeyondRange && beyondRange.length > 0)) && (
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg z-10 text-xs font-semibold border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span className="text-emerald-800">
                    {withinRange.length} nearby
                  </span>
                </div>
                {showBeyondRange && beyondRange.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-amber-800">
                      {beyondRange.length} beyond
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Action Modal */}
      <AnimatePresence>
        {showActionModal && selectedCenterForAction && (
          <ActionModal
            center={selectedCenterForAction}
            match={selectedMatch}
            type={searchType}
            date={actionDate}
            time={actionTime}
            notes={actionNotes}
            onDateChange={setActionDate}
            onTimeChange={setActionTime}
            onNotesChange={setActionNotes}
            onSubmit={handleActionSubmit}
            onClose={closeActionModal}
            submitting={actionSubmitting}
            error={actionError}
            fulfillmentMethod={fulfillmentMethod}
            setFulfillmentMethod={setFulfillmentMethod}
            deliveryAddress={deliveryAddress}
            setDeliveryAddress={setDeliveryAddress}
          />
        )}
      </AnimatePresence>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <HelpModal
            slides={helpSlides}
            onClose={() => setShowHelp(false)}
            currentSlide={helpSlide}
            setSlide={setHelpSlide}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default DozaMapPanel;

// ═══════════════════════════════════════════════════════════════
//  ACTION MODAL
// ═══════════════════════════════════════════════════════════════
const ActionModal = memo(function ActionModal({
  center,
  match,
  type,
  date,
  time,
  notes,
  onDateChange,
  onTimeChange,
  onNotesChange,
  onSubmit,
  onClose,
  submitting,
  error,
  fulfillmentMethod,
  setFulfillmentMethod,
  deliveryAddress,
  setDeliveryAddress,
}: {
  center: SearchResult;
  match: MatchItem | null;
  type: "service" | "drug" | "test";
  date: string;
  time: string;
  notes: string;
  onDateChange: (val: string) => void;
  onTimeChange: (val: string) => void;
  onNotesChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  submitting: boolean;
  error: string;
  fulfillmentMethod: "pickup" | "delivery";
  setFulfillmentMethod: (val: "pickup" | "delivery") => void;
  deliveryAddress: string;
  setDeliveryAddress: (val: string) => void;
}) {
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [appointmentsForDate, setAppointmentsForDate] = useState<any[]>([]);
  const { user } = useUser();

  const fetchSlots = useCallback(async () => {
    if (type !== "service" || !date || !center.centerId || !user?.id) return;
    setLoadingSlots(true);
    try {
      const res = await fetch(
        `/api/centers/${center.centerId}/appointments?date=${date}`,
        {
          headers: { "x-user-id": user.id },
        },
      );
      if (!res.ok) {
        setAppointmentsForDate([]);
        return;
      }
      const data = await res.json();
      setAppointmentsForDate(data.success ? data.data || [] : []);
    } catch (err) {
      console.warn("Failed to fetch appointments, using no conflicts:", err);
      setAppointmentsForDate([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [type, date, center.centerId, user?.id]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const generateTimeSlots = useCallback(() => {
    if (type !== "service") return [];
    const hours = center.operatingHours;
    if (!hours || !hours.opening || !hours.closing) {
      const slots: string[] = [];
      for (let h = 9; h < 17; h++) {
        slots.push(`${String(h).padStart(2, "0")}:00`);
        slots.push(`${String(h).padStart(2, "0")}:30`);
      }
      return slots;
    }
    const [openHour, openMin] = hours.opening.split(":").map(Number);
    const [closeHour, closeMin] = hours.closing.split(":").map(Number);
    const slots: string[] = [];
    const current = new Date();
    current.setHours(openHour, openMin, 0, 0);
    const close = new Date();
    close.setHours(closeHour, closeMin, 0, 0);
    while (current < close) {
      const h = String(current.getHours()).padStart(2, "0");
      const m = String(current.getMinutes()).padStart(2, "0");
      slots.push(`${h}:${m}`);
      current.setMinutes(current.getMinutes() + 30);
    }
    return slots;
  }, [center.operatingHours, type]);

  useEffect(() => {
    if (type !== "service") return;
    const allSlots = generateTimeSlots();
    const takenTimes = appointmentsForDate
      .filter((app) => app.status !== "cancelled" && app.status !== "completed")
      .map((app) => {
        const start = new Date(app.startTime);
        return `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
      });
    setAvailableSlots(allSlots.filter((slot) => !takenTimes.includes(slot)));
  }, [appointmentsForDate, generateTimeSlots, type]);

  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);

  const isService = type === "service";
  const isDrug = type === "drug";
  const isTest = type === "test";
  const modalTitle = isService
    ? "Book Appointment"
    : isDrug
      ? "Order Medication"
      : "Request Lab Test";
  const submitLabel = isService
    ? "Book Appointment"
    : isDrug
      ? "Place Order"
      : "Send Request";

  const retailPrice = match?.price
    ? Math.round(match.price * (1 + RETAIL_MARKUP_PERCENT / 100))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[200] sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.98, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.98, y: 20 }}
        className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-emerald-100 max-h-[92dvh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 custom-emerald-scrollbar"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="sm:hidden flex justify-center mb-2" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-emerald-200" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-emerald-900">{modalTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "min-h-10 min-w-10 inline-flex items-center justify-center hover:bg-emerald-50 rounded-xl transition-colors text-emerald-600",
              FOCUS,
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-emerald-900 mb-4">
          {center.centerName}
          <span className="block text-xs text-emerald-700/70 mt-0.5">
            {center.address}
          </span>
          {isService && center.operatingHours && (
            <span className="block text-xs text-emerald-700/70 mt-1">
              Hours: {center.operatingHours.opening} –{" "}
              {center.operatingHours.closing}
            </span>
          )}
        </p>

        {!isService && match && (
          <div className="bg-emerald-50 rounded-xl p-4 mb-4 border border-emerald-100 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-emerald-900 truncate">
                  {match.name}
                </h3>
                {match.description && (
                  <p className="text-xs text-emerald-700/70 mt-0.5">
                    {match.description}
                  </p>
                )}
              </div>
              {retailPrice !== null && (
                <span className="text-lg font-bold text-emerald-700 shrink-0">
                  ₦{retailPrice.toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {match.unit && (
                <span className="bg-white px-2 py-1 rounded border border-emerald-100 text-emerald-800">
                  Unit: {match.unit}
                </span>
              )}
              {match.prescriptionRequired !== undefined && (
                <span
                  className={cn(
                    "px-2 py-1 rounded border",
                    match.prescriptionRequired
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-emerald-100 text-emerald-800 border-emerald-200",
                  )}
                >
                  {match.prescriptionRequired ? "Rx Required" : "OTC"}
                </span>
              )}
              {isDrug && (
                <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded border border-emerald-200">
                  Medication
                </span>
              )}
              {isTest && (
                <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded border border-emerald-200">
                  Lab Test
                </span>
              )}
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {isService && (
            <>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  Date *
                </label>
                <DatePicker
                  value={date}
                  onChange={onDateChange}
                  placeholder="Select date"
                  minDate={minDate}
                  maxDate={maxDate}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  Time *
                </label>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-emerald-700/70 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading available slots…
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-emerald-scrollbar">
                    {availableSlots.length > 0 ? (
                      availableSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => onTimeChange(slot)}
                          className={cn(
                            "min-h-11 rounded-xl text-sm font-semibold border transition-colors",
                            time === slot
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-50",
                            FOCUS,
                          )}
                        >
                          {slot}
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-emerald-700/70 col-span-3">
                        No available slots on this day.
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-emerald-700/60">
                  Appointments are 30 minutes long.
                </p>
              </div>
            </>
          )}

          {isDrug && (
            <>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  defaultValue="1"
                  className={cn(
                    "w-full min-h-11 px-3.5 bg-emerald-50/50 border border-emerald-100 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 rounded-xl text-base sm:text-sm text-emerald-900 outline-none transition",
                    FOCUS,
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  Fulfilment method
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFulfillmentMethod("pickup")}
                    className={cn(
                      "relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-colors min-h-[88px]",
                      fulfillmentMethod === "pickup"
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-emerald-100 bg-white hover:border-emerald-200",
                      FOCUS,
                    )}
                  >
                    <Store
                      className={cn(
                        "w-6 h-6 mb-1.5",
                        fulfillmentMethod === "pickup"
                          ? "text-emerald-600"
                          : "text-emerald-700/60",
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-bold",
                        fulfillmentMethod === "pickup"
                          ? "text-emerald-800"
                          : "text-emerald-700",
                      )}
                    >
                      Pickup
                    </span>
                    <span className="text-[11px] text-emerald-700/60 mt-0.5">
                      Visit the store
                    </span>
                    {fulfillmentMethod === "pickup" && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFulfillmentMethod("delivery")}
                    className={cn(
                      "relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-colors min-h-[88px]",
                      fulfillmentMethod === "delivery"
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-emerald-100 bg-white hover:border-emerald-200",
                      FOCUS,
                    )}
                  >
                    <Truck
                      className={cn(
                        "w-6 h-6 mb-1.5",
                        fulfillmentMethod === "delivery"
                          ? "text-emerald-600"
                          : "text-emerald-700/60",
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-bold",
                        fulfillmentMethod === "delivery"
                          ? "text-emerald-800"
                          : "text-emerald-700",
                      )}
                    >
                      Delivery
                    </span>
                    <span className="text-[11px] text-emerald-700/60 mt-0.5">
                      To your address
                    </span>
                    {fulfillmentMethod === "delivery" && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </button>
                </div>
              </div>
              {fulfillmentMethod === "delivery" && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="delivery-address"
                    className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider"
                  >
                    Delivery address *
                  </label>
                  <textarea
                    id="delivery-address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    rows={3}
                    className={cn(
                      "w-full px-3.5 py-2.5 bg-emerald-50/50 border border-emerald-100 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 rounded-xl text-base sm:text-sm text-emerald-900 placeholder:text-emerald-700/40 outline-none transition resize-none",
                      FOCUS,
                    )}
                    placeholder="Enter your full delivery address"
                    required
                  />
                </div>
              )}
            </>
          )}

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              {isService ? "Reason / notes" : isDrug ? "Instructions" : "Notes"}
            </label>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={3}
              className={cn(
                "w-full px-3.5 py-2.5 bg-emerald-50/50 border border-emerald-100 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 rounded-xl text-base sm:text-sm text-emerald-900 placeholder:text-emerald-700/40 outline-none transition resize-none",
                FOCUS,
              )}
              placeholder={
                isService
                  ? "e.g., I have a persistent cough…"
                  : isDrug
                    ? "e.g., I need generic version if available"
                    : "e.g., I need the test done urgently"
              }
            />
          </div>

          {error && (
            <div
              role="alert"
              className="bg-rose-50 text-rose-800 p-3 rounded-xl text-sm border border-rose-200 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "min-h-11 px-4 rounded-xl text-sm font-semibold text-emerald-700 border border-emerald-200 bg-white hover:bg-emerald-50 transition-colors",
                FOCUS,
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (isService && !time)}
              className={cn(
                "min-h-11 px-5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
                FOCUS,
              )}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Processing…" : submitLabel}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
});

// ═══════════════════════════════════════════════════════════════
//  INFO WINDOW CONTENT
// ═══════════════════════════════════════════════════════════════
function InfoWindowContent({
  place,
  maxDistance,
  onAction,
  actionLabel,
}: {
  place: SearchResult;
  maxDistance: number;
  onAction: (match?: MatchItem) => void;
  actionLabel: string;
}) {
  const status = getStatusLabel(place.operatingHours);
  const isBeyond = place.distance > maxDistance;
  const firstMatch = place.matches?.[0];

  return (
    <div className="p-3.5 max-w-[290px] sm:max-w-xs bg-white text-emerald-900 font-sans rounded-2xl">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-md shrink-0",
              status.classes,
            )}
          >
            {status.label}
          </span>
          <span className="text-emerald-200">•</span>
          <span className="text-xs font-bold text-emerald-700 capitalize truncate">
            {place.centerType?.toLowerCase().replace("_", " ")}
          </span>
        </div>
        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 shrink-0">
          {place.distance ? `${place.distance.toFixed(1)} km` : "Nearby"}
        </span>
      </div>

      <h4 className="font-bold text-emerald-900 text-sm sm:text-base leading-snug tracking-tight mb-1.5 line-clamp-1">
        {place.centerName}
      </h4>

      {isBeyond && (
        <div className="mb-2.5 flex items-center gap-1.5 bg-amber-50 text-amber-800 px-2.5 py-1.5 rounded-xl border border-amber-200">
          <AlertTriangle size={13} className="shrink-0 text-amber-700" />
          <span className="text-xs font-semibold leading-tight">
            {place.distance.toFixed(1)} km away (exceeds {maxDistance}km radius)
          </span>
        </div>
      )}

      {place.ratings && place.ratings.count > 0 && (
        <div className="mb-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span className="font-bold text-xs text-emerald-900">
                {place.ratings.average.toFixed(1)}
              </span>
            </div>
            <span className="text-xs text-emerald-700/70 font-medium">
              ({place.ratings.count} reviews)
            </span>
          </div>
          {place.ratings.comments && place.ratings.comments.length > 0 && (
            <div className="text-xs text-emerald-800 italic bg-emerald-50 p-2 rounded-xl border border-emerald-100 line-clamp-2">
              "{place.ratings.comments[0].comment}"
              <span className="text-emerald-600 not-italic font-semibold ml-1">
                — {place.ratings.comments[0].userName}
              </span>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-emerald-700/70 mb-3 flex items-start gap-1.5">
        <MapPin size={13} className="shrink-0 mt-0.5 text-emerald-600" />
        <span className="line-clamp-2 leading-relaxed">
          {place.address || "Address not catalogued"}
        </span>
      </p>

      {place.matches && place.matches.length > 0 && (
        <div className="mb-3 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Available matches
            </p>
            {place.matches.length > 2 && (
              <span className="text-xs font-bold text-emerald-600">
                +{place.matches.length - 2} more
              </span>
            )}
          </div>
          <div className="space-y-1 divide-y divide-emerald-100">
            {place.matches.slice(0, 2).map((match) => {
              const displayPrice = Math.round(
                match.price * (1 + RETAIL_MARKUP_PERCENT / 100),
              );
              return (
                <div
                  key={match.id}
                  className="flex justify-between items-center text-xs pt-1 first:pt-0"
                >
                  <span className="truncate max-w-[140px] text-emerald-800 font-medium">
                    {match.name}
                  </span>
                  <span className="font-bold text-emerald-700 shrink-0">
                    ₦{displayPrice.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1.5 border-t border-emerald-100">
        {place.phone && (
          <a
            href={`tel:${place.phone}`}
            className="flex-1 min-h-10 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-center text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-95 border border-emerald-100"
          >
            <Phone size={13} className="text-emerald-600 shrink-0" />
            <span>Call</span>
          </a>
        )}
        <button
          onClick={() => onAction(firstMatch)}
          className={cn(
            "flex-1 min-h-10 px-3 text-white rounded-xl text-center text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-95",
            isBeyond
              ? "bg-amber-600 hover:bg-amber-700"
              : "bg-emerald-600 hover:bg-emerald-700",
          )}
        >
          {actionLabel === "Book Appointment" ? (
            <Calendar size={13} className="shrink-0" />
          ) : actionLabel === "Order Now" ? (
            <ShoppingCart size={13} className="shrink-0" />
          ) : (
            <Beaker size={13} className="shrink-0" />
          )}
          <span>{actionLabel}</span>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  RESULT CARD
// ═══════════════════════════════════════════════════════════════
function ResultCard({
  result,
  isActive,
  maxDistance,
  onClick,
  onAction,
  onFocusMap,
  actionLabel,
}: {
  result: SearchResult;
  isActive: boolean;
  maxDistance: number;
  onClick: () => void;
  onAction: (match?: MatchItem) => void;
  onFocusMap: () => void;
  actionLabel: string;
}) {
  const firstMatch = result.matches?.[0];
  const estRetailPrice = firstMatch
    ? Math.round(firstMatch.price * (1 + RETAIL_MARKUP_PERCENT / 100))
    : null;
  const isBeyond = result.distance > maxDistance;
  const status = getStatusLabel(result.operatingHours);

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden",
        isActive
          ? "bg-emerald-50 border-2 border-emerald-500 shadow-sm"
          : isBeyond
            ? "bg-amber-50/60 border border-amber-200 hover:border-amber-300"
            : "bg-white border border-emerald-100 hover:border-emerald-200 hover:shadow-sm",
      )}
    >
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
      )}

      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shrink-0",
            isActive
              ? "bg-emerald-600 text-white"
              : isBeyond
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-700",
          )}
        >
          {result.centerName.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2 mb-1">
            <h4 className="font-bold truncate text-sm tracking-tight text-emerald-900">
              {result.centerName}
            </h4>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span
                className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-lg border",
                  isActive
                    ? "bg-white border-emerald-500 text-emerald-700"
                    : isBeyond
                      ? "bg-amber-100 border-amber-200 text-amber-800"
                      : "bg-emerald-50 border-emerald-100 text-emerald-700",
                )}
              >
                {result.distance
                  ? `${result.distance.toFixed(1)} km`
                  : "Nearby"}
              </span>
              {isBeyond && (
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                  Beyond range
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span
              className={cn(
                "text-xs font-bold px-2 py-0.5 rounded-md",
                status.classes,
              )}
            >
              {status.label}
            </span>
            <span className="text-emerald-200">•</span>
            <span className="text-xs font-medium capitalize truncate text-emerald-700/70">
              {result.centerType?.toLowerCase().replace("_", " ")}
            </span>
          </div>

          {result.ratings && result.ratings.count > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md border bg-amber-50 border-amber-200">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span className="text-xs font-bold text-emerald-900">
                  {result.ratings.average.toFixed(1)}
                </span>
              </div>
              <span className="text-xs text-emerald-700/70">
                ({result.ratings.count} reviews)
              </span>
            </div>
          )}

          {firstMatch && (
            <div className="mt-3 pt-3 border-t border-emerald-100 flex flex-col gap-3">
              <div
                className={cn(
                  "flex justify-between items-center p-3 rounded-xl border",
                  isActive
                    ? "bg-white border-emerald-200"
                    : "bg-emerald-50/60 border-emerald-100",
                )}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="text-[10px] uppercase font-bold tracking-wider mb-0.5 text-emerald-700/70">
                    Requested resource
                  </p>
                  <p className="text-sm font-semibold truncate text-emerald-900">
                    {firstMatch.name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase font-bold tracking-wider mb-0.5 text-emerald-700/70">
                    Est. retail
                  </p>
                  <p className="text-sm font-bold tracking-tight text-emerald-700">
                    ₦{estRetailPrice?.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(firstMatch);
                  }}
                  className={cn(
                    "flex-1 min-h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2",
                    FOCUS,
                  )}
                >
                  {actionLabel === "Book Appointment" ? (
                    <Calendar className="w-4 h-4 shrink-0" />
                  ) : actionLabel === "Order Now" ? (
                    <ShoppingCart className="w-4 h-4 shrink-0" />
                  ) : (
                    <Beaker className="w-4 h-4 shrink-0" />
                  )}
                  <span>{actionLabel}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFocusMap();
                  }}
                  className={cn(
                    "min-h-11 min-w-11 px-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5",
                    isActive
                      ? "bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700",
                    FOCUS,
                  )}
                  title="Show on map"
                  aria-label="Show on map"
                >
                  <Info className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </div>
          )}

          {result.matches?.length > 1 && (
            <div className="mt-3 text-xs font-medium text-right flex items-center justify-end gap-1 text-emerald-700/70">
              <span className="font-bold text-emerald-600">
                +{result.matches.length - 1}
              </span>{" "}
              more alternatives
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  EMPTY STATE
// ═══════════════════════════════════════════════════════════════
function EmptyState({
  searchQuery,
  searchType,
  maxDistance,
  showBeyondRange,
}: {
  searchQuery: string;
  searchType: string;
  maxDistance: number;
  showBeyondRange: boolean;
}) {
  const getMessage = () => {
    if (searchQuery) {
      if (showBeyondRange) {
        return `No ${searchType}s found matching "${searchQuery}" anywhere within ${maxDistance}km or beyond.`;
      }
      return `No ${searchType}s found matching "${searchQuery}" within ${maxDistance}km. Try expanding your distance or enabling beyond-range results.`;
    }
    if (showBeyondRange) {
      return `No ${searchType}s found within ${maxDistance}km or beyond. Try a different category.`;
    }
    return `No ${searchType}s found within ${maxDistance}km. Try enabling beyond-range results to see farther options.`;
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
        <Search className="w-6 h-6 text-emerald-500" />
      </div>
      <h4 className="text-emerald-900 font-bold text-sm mb-1">
        No matches found
      </h4>
      <p className="text-emerald-700/70 text-xs leading-relaxed max-w-[240px]">
        {getMessage()}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  HELP MODAL
// ═══════════════════════════════════════════════════════════════
function HelpModal({
  slides,
  onClose,
  currentSlide,
  setSlide,
}: {
  slides: any[];
  onClose: () => void;
  currentSlide: number;
  setSlide: (n: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 50, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 50, scale: 0.95 }}
        className="bg-white rounded-t-3xl sm:rounded-2xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6 border border-emerald-100"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="sm:hidden flex justify-center mb-3" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-emerald-200" />
        </div>
        <div className="text-center">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-emerald-100">
            {slides[currentSlide].icon}
          </div>
          <h3 className="text-xl font-bold text-emerald-900 mb-2 tracking-tight">
            {slides[currentSlide].title}
          </h3>
          <p className="text-emerald-700/80 text-sm leading-relaxed mb-6 px-2">
            {slides[currentSlide].description}
          </p>
          <div className="flex justify-center gap-1.5 mb-6">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === currentSlide
                    ? "w-5 bg-emerald-600"
                    : "w-2 bg-emerald-200",
                )}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {currentSlide < slides.length - 1 ? (
              <button
                onClick={() => setSlide(currentSlide + 1)}
                className={cn(
                  "w-full min-h-11 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-sm rounded-xl transition-colors border border-emerald-100",
                  FOCUS,
                )}
              >
                Next step
              </button>
            ) : (
              <button
                onClick={onClose}
                className={cn(
                  "w-full min-h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors",
                  FOCUS,
                )}
              >
                Start locating
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
