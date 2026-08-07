// User App: app/dashboard/panels/DozaMapPanel.tsx
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
import { poppins, bebasNeue } from "@/app/constants";
import { useDashboard } from "../../DashboardContext";
import { useUser } from "../../hooks/useProfile";
import { mutate } from "swr";

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

const searchTabs = [
  {
    id: "service",
    label: "Checkups & Care",
    icon: Stethoscope,
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    id: "drug",
    label: "Medicines",
    icon: Pill,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
  },
  {
    id: "test",
    label: "Lab Tests",
    icon: FlaskConical,
    color: "text-purple-500",
    bg: "bg-purple-50",
  },
] as const;

type SearchType = (typeof searchTabs)[number]["id"];

const helpSlides = [
  {
    icon: <Search className="w-6 h-6" />,
    title: "1. Search for Care",
    description:
      "Type any drug name, medical checkup, or lab test you need. We'll search local inventories automatically.",
  },
  {
    icon: <Navigation className="w-6 h-6" />,
    title: "2. Set Your Distance",
    description:
      "Choose how far you are willing to travel. We rank options by proximity to save you a long journey.",
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: "3. Check Availability",
    description:
      "See verified pricing, check if the clinic is open right now, and phone them directly before leaving home.",
  },
];

// ---------- Helpers ----------
function getStatusLabel(hours?: any): { label: string; classes: string } {
  if (!hours?.opening || !hours?.closing || !hours?.days) {
    return {
      label: "Hours Unverified",
      classes: "bg-slate-100 text-slate-600",
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
      classes: "bg-rose-50 text-rose-600 border border-rose-100",
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
        classes: "bg-emerald-50 text-emerald-600 border border-emerald-100",
      }
    : {
        label: "Closed Right Now",
        classes: "bg-rose-50 text-rose-600 border border-rose-100",
      };
}

function formatDistance(distance: number, isBeyondRange: boolean): string {
  return isBeyondRange
    ? `${distance.toFixed(1)} km (Beyond range)`
    : `${distance.toFixed(1)} km`;
}

// ---------- Skeleton Loaders ----------
function SkeletonResultCard() {
  return (
    <div className="p-4 rounded-2xl border border-slate-100 bg-white space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-2/3 bg-slate-200 rounded-md" />
          <div className="h-2.5 w-1/3 bg-slate-100 rounded-md" />
        </div>
      </div>
      <div className="h-px bg-slate-50" />
      <div className="flex justify-between items-center">
        <div className="h-3 w-16 bg-slate-100 rounded-md" />
        <div className="h-4 w-20 bg-slate-200 rounded-md" />
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
    <div className="w-full h-full bg-slate-100 flex items-center justify-center p-6 text-center">
      <div className="space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
        <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
          Mapping Health Centers...
        </p>
      </div>
    </div>
  );
}

// ---------- Memoized Search Input ----------
const SearchInput = memo(
  ({
    value,
    onChange,
    placeholder,
    isLoading,
    onClear,
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    isLoading: boolean;
    onClear: () => void;
  }) => (
    <div className="flex-1 relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
        ) : (
          <Search className="w-5 h-5" />
        )}
      </div>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 text-slate-800 font-semibold text-sm transition-all outline-none placeholder:text-slate-400"
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  ),
);
SearchInput.displayName = "SearchInput";

// ---------- Main Component (memoised) ----------
const DozaMapPanel = memo(function DozaMapPanel() {
  const { location: userLocation, loading: locationLoading } =
    useUserLocation();
  const { setActivePanel } = useDashboard();
  const { user } = useUser();

  // Debounced location
  const [debouncedLocation, setDebouncedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const locationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (userLocation) {
      if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
      locationTimeoutRef.current = setTimeout(() => {
        if (
          !debouncedLocation ||
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

  const [mapCenter, setMapCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SearchResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("service");
  const [maxDistance, setMaxDistance] = useState(50);
  const [showOpenNow, setShowOpenNow] = useState(false);
  const [showBeyondRange, setShowBeyondRange] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpSlide, setHelpSlide] = useState(0);
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // Distance dropdown state
  const [distanceOpen, setDistanceOpen] = useState(false);
  const distanceDropdownRef = useRef<HTMLDivElement>(null);

  // Close distance dropdown on outside click
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

  // Fetch all centres (big radius to bypass API distance filter)
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
      if (result.distance <= maxDistance) {
        within.push(result);
      } else {
        beyond.push({ ...result, isBeyondRange: true });
      }
    });
    return { withinRange: within, beyondRange: beyond };
  }, [results, maxDistance]);

  const filteredResults = useMemo(() => {
    let res = [...withinRange];
    if (showBeyondRange) res = [...res, ...beyondRange];
    if (showOpenNow) {
      res = res.filter((r: SearchResult) => {
        const status = getStatusLabel(r.operatingHours);
        return status.label === "Open Now";
      });
    }
    return res.sort((a, b) => a.distance - b.distance);
  }, [withinRange, beyondRange, showOpenNow, showBeyondRange]);

  useEffect(() => {
    if (debouncedLocation) setMapCenter(debouncedLocation);
    else if (!locationLoading) setMapCenter(DEFAULT_CENTER);
  }, [debouncedLocation, locationLoading]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [],
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  // ---------- Action handlers ----------
  const handleAction = (center: SearchResult, match?: MatchItem) => {
    setSelectedCenterForAction(center);
    const selected = match || center.matches?.[0] || null;
    setSelectedMatch(selected);
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const roundedMinutes = Math.ceil(now.getMinutes() / 30) * 30;
    now.setMinutes(roundedMinutes);
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().slice(0, 5);
    setActionDate(dateStr);
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
      let payload: any = {
        centerId: selectedCenterForAction.centerId,
      };

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
        if (fulfillmentMethod === "delivery") {
          payload.deliveryAddress = deliveryAddress;
        }
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
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
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

  return (
    <div
      key="doza-map-panel"
      className={cn(
        "min-h-screen flex flex-col bg-[#F8FAFC] antialiased",
        poppins.className,
      )}
    >
      {/* HEADER */}
      <header className="w-full px-4 pt-4 md:pt-6 pb-2 max-w-7xl mx-auto z-30">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-[0.25em]">
                Doza Health Network
              </span>
            </div>
            <h1
              className={cn(
                "text-4xl md:text-5xl text-slate-900 leading-[1.1] tracking-tight",
                bebasNeue.className,
              )}
            >
              Medical <span className="text-emerald-600">Locator</span>
            </h1>
            <p className="text-sm text-slate-600 mt-2 max-w-md">
              Find health centers near you
            </p>
          </div>
          <button
            onClick={() => {
              setHelpSlide(0);
              setShowHelp(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition shadow-sm whitespace-nowrap"
          >
            <HelpCircle size={16} />
            <span className="hidden sm:inline">Help</span>
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <section className="w-full px-4 py-2 max-w-7xl mx-auto z-30 space-y-3">
        <div className="bg-white border border-slate-100 rounded-3xl p-3 sm:p-4 shadow-md">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            {/* Search Input */}
            <div className="flex-1">
              <SearchInput
                key="doza-search-input"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={
                  searchType === "service"
                    ? "Search checkups, consultations, surgeries..."
                    : searchType === "drug"
                      ? "Search tablets, syrups, insulin generics..."
                      : "Search blood tests, scans, x-rays..."
                }
                isLoading={isLoading}
                onClear={handleClearSearch}
              />
            </div>

            {/* Search Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100/80 p-1 rounded-2xl overflow-x-auto shrink-0">
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
                      "flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-[10px] sm:text-xs font-bold tracking-tight transition-all relative",
                      isSelected
                        ? "bg-white text-slate-900 shadow-sm font-extrabold"
                        : "text-slate-500 hover:text-slate-800",
                    )}
                  >
                    <TabIcon
                      className={cn(
                        "w-3.5 h-3.5 shrink-0",
                        isSelected ? tab.color : "text-slate-400",
                      )}
                    />
                    <span className="truncate">{tab.label}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          "ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[9px] font-bold rounded-full",
                          isSelected
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-600",
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Filters Area */}
            <div className="flex flex-col sm:flex-row lg:items-center gap-2.5 w-full lg:w-auto shrink-0">
              {/* Custom Distance Dropdown */}
              <div
                className="relative flex-1 lg:w-52"
                ref={distanceDropdownRef}
              >
                <div
                  onClick={() => setDistanceOpen(!distanceOpen)}
                  className={cn(
                    "relative flex items-center gap-3.5 px-3.5 py-2.5 bg-slate-50/80 border rounded-[22px] transition-all duration-300 h-16 lg:h-auto cursor-pointer shadow-2xs group",
                    distanceOpen
                      ? "bg-white border-emerald-500 ring-4 ring-emerald-500/10 shadow-md"
                      : "border-slate-200/80 hover:bg-white hover:border-slate-300 hover:shadow-md",
                  )}
                >
                  {/* Icon Box */}
                  <div className="p-2.5 bg-white rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-emerald-500/30 transition-all">
                    <Navigation className="w-4 h-4 text-emerald-600" />
                  </div>

                  {/* Label + Selected Value */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                      Search Radius
                    </span>
                    <span className="text-xs font-extrabold text-slate-900 truncate tracking-tight">
                      Within {maxDistance} KM
                    </span>
                  </div>

                  {/* Chevron Indicator */}
                  <div className="text-slate-400 group-hover:text-slate-700 transition-colors shrink-0 pr-1">
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform duration-300",
                        distanceOpen && "rotate-180 text-emerald-600",
                      )}
                    />
                  </div>
                </div>

                {/* Dropdown Options */}
                <AnimatePresence>
                  {distanceOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 4, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-[24px] shadow-2xl p-2 z-50"
                    >
                      <div className="space-y-1">
                        {[5, 10, 20, 50, 100, 200, 500].map((km) => {
                          const isSelected = km === maxDistance;
                          return (
                            <div
                              key={km}
                              onClick={() => {
                                setMaxDistance(km);
                                setDistanceOpen(false);
                              }}
                              className={cn(
                                "flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold cursor-pointer transition-all duration-200",
                                isSelected
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                                  : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-900",
                              )}
                            >
                              <span>Within {km} KM</span>
                              {isSelected && (
                                <Check className="w-4 h-4 text-white shrink-0 ml-2" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowOpenNow(!showOpenNow)}
                  className={cn(
                    "py-3 sm:py-2.5 px-4 rounded-2xl text-xs font-semibold border transition-all text-center truncate",
                    showOpenNow
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                      : "bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50",
                  )}
                >
                  Open Now
                </button>

                <button
                  onClick={() => setShowBeyondRange(!showBeyondRange)}
                  className={cn(
                    "py-3 sm:py-2.5 px-4 rounded-2xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 truncate",
                    showBeyondRange
                      ? "bg-slate-900 border-slate-900 text-white shadow-sm shadow-slate-900/20"
                      : "bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Beyond {maxDistance}km</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map & Sidebar */}
      <main className="flex-1 flex flex-col md:flex-row gap-4 px-4 pb-4 max-w-7xl w-full mx-auto min-h-0 overflow-hidden relative">
        <aside
          className={cn(
            "bg-white rounded-3xl border border-slate-100 shadow-sm transition-all duration-300 z-20 flex flex-col shrink-0 overflow-hidden",
            isFullscreenMap
              ? "hidden md:flex md:w-[380px]"
              : "w-full md:w-[380px]",
            isSidebarExpanded ? "h-[50vh] md:h-auto flex-1" : "h-14 md:h-auto",
          )}
        >
          <div
            onClick={() => {
              if (window.innerWidth < 768)
                setIsSidebarExpanded(!isSidebarExpanded);
            }}
            className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50 cursor-pointer md:cursor-default"
          >
            <div>
              <h3
                className={cn(
                  "text-xl text-slate-900 tracking-tight font-black",
                  bebasNeue.className,
                )}
              >
                Search <span className="text-emerald-600">Results</span>
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {filteredResults.length} options match criteria
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {withinRange.length > 0 && (
                  <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100">
                    Nearby: {withinRange.length}
                  </span>
                )}
                {showBeyondRange && beyondRange.length > 0 && (
                  <span className="text-[10px] font-extrabold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-100">
                    Beyond: {beyondRange.length}
                  </span>
                )}
              </div>
              <button className="md:hidden text-slate-400 p-1">
                {isSidebarExpanded ? (
                  <ChevronDown size={18} />
                ) : (
                  <ChevronUp size={18} />
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar bg-slate-50/20">
            {isLoading ? (
              <SkeletonSidebar />
            ) : error ? (
              <div className="p-6 text-center text-rose-500 text-xs font-semibold bg-rose-50 rounded-2xl border border-rose-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Could not synchronize medical logs. Check your database
                  connections.
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
                  actionLabel={
                    searchType === "service"
                      ? "Book Appointment"
                      : searchType === "drug"
                        ? "Order Now"
                        : "Request Test"
                  }
                />
              ))
            )}
          </div>
        </aside>

        <section className="flex-1 min-h-[300px] md:min-h-0 relative rounded-3xl overflow-hidden border border-slate-100 shadow-md bg-slate-100">
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
                      actionLabel={
                        searchType === "service"
                          ? "Book Appointment"
                          : searchType === "drug"
                            ? "Order Now"
                            : "Request Test"
                      }
                    />
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          )}

          <button
            onClick={() => setIsFullscreenMap(!isFullscreenMap)}
            className="absolute bottom-4 right-4 p-3 bg-slate-900 text-white rounded-xl shadow-lg z-10 hover:bg-slate-800 active:scale-95 transition-all hidden md:block"
          >
            {isFullscreenMap ? (
              <Minimize2 size={18} />
            ) : (
              <Maximize2 size={18} />
            )}
          </button>

          {(withinRange.length > 0 ||
            (showBeyondRange && beyondRange.length > 0)) && (
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-2 shadow-lg z-10 text-[10px] font-bold">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">Within {maxDistance}km</span>
                </div>
                {showBeyondRange && beyondRange.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-slate-600">
                      Beyond {maxDistance}km
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
            key="doza-action-modal"
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
    </div>
  );
});

export default DozaMapPanel;

// ---------- ActionModal ----------

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
        { headers: { "x-user-id": user.id } },
      );
      if (!res.ok) {
        setAppointmentsForDate([]);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setAppointmentsForDate(data.data || []);
      } else {
        setAppointmentsForDate([]);
      }
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
    let current = new Date();
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
    const available = allSlots.filter((slot) => !takenTimes.includes(slot));
    setAvailableSlots(available);
  }, [appointmentsForDate, generateTimeSlots, type]);

  const minDate = new Date().toISOString().split("T")[0];
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);
  const maxDateStr = maxDate.toISOString().split("T")[0];

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
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200/80 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className={cn(
              "text-xl font-bold text-slate-800",
              bebasNeue.className,
            )}
          >
            {modalTitle}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          {center.centerName}
          <span className="block text-xs text-slate-400">{center.address}</span>
          {isService && center.operatingHours && (
            <span className="block text-xs text-slate-500 mt-1">
              Hours: {center.operatingHours.opening} –{" "}
              {center.operatingHours.closing}
            </span>
          )}
        </p>

        {!isService && match && (
          <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-800">{match.name}</h3>
                {match.description && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {match.description}
                  </p>
                )}
              </div>
              {retailPrice !== null && (
                <span className="text-lg font-black text-emerald-600">
                  ₦{retailPrice.toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {match.unit && (
                <span className="bg-white px-2 py-1 rounded border border-slate-200 text-gray-400">
                  Unit: {match.unit}
                </span>
              )}
              {match.prescriptionRequired !== undefined && (
                <span
                  className={cn(
                    "px-2 py-1 rounded border",
                    match.prescriptionRequired
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200",
                  )}
                >
                  {match.prescriptionRequired ? "Prescription Required" : "OTC"}
                </span>
              )}
              {isDrug && (
                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                  Medication
                </span>
              )}
              {isTest && (
                <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-200">
                  Lab Test
                </span>
              )}
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {isService && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  min={minDate}
                  max={maxDateStr}
                  value={date}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Time *
                </label>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading available slots...
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {availableSlots.length > 0 ? (
                      availableSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => onTimeChange(slot)}
                          className={cn(
                            "py-2 px-3 rounded-xl text-sm font-medium border transition-all",
                            time === slot
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
                          )}
                        >
                          {slot}
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 col-span-3">
                        No available slots on this day.
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Select a time slot. Appointments are 30 minutes.
                </p>
              </div>
            </>
          )}

          {isDrug && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  defaultValue="1"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm text-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Fulfilment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    type="button"
                    onClick={() => setFulfillmentMethod("pickup")}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200",
                      fulfillmentMethod === "pickup"
                        ? "border-emerald-500 bg-emerald-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    <Store
                      className={cn(
                        "w-6 h-6 mb-1.5 transition-colors",
                        fulfillmentMethod === "pickup"
                          ? "text-emerald-600"
                          : "text-slate-400",
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-bold",
                        fulfillmentMethod === "pickup"
                          ? "text-emerald-700"
                          : "text-slate-600",
                      )}
                    >
                      Pickup
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      Visit the store
                    </span>
                    {fulfillmentMethod === "pickup" && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => setFulfillmentMethod("delivery")}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200",
                      fulfillmentMethod === "delivery"
                        ? "border-emerald-500 bg-emerald-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    <Truck
                      className={cn(
                        "w-6 h-6 mb-1.5 transition-colors",
                        fulfillmentMethod === "delivery"
                          ? "text-emerald-600"
                          : "text-slate-400",
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-bold",
                        fulfillmentMethod === "delivery"
                          ? "text-emerald-700"
                          : "text-slate-600",
                      )}
                    >
                      Delivery
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      We’ll bring it to you
                    </span>
                    {fulfillmentMethod === "delivery" && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </motion.button>
                </div>
              </div>
              {fulfillmentMethod === "delivery" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Delivery Address *
                  </label>
                  <textarea
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm text-slate-800 placeholder:text-slate-400"
                    placeholder="Enter your full delivery address"
                    required
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {isService
                ? "Reason / Notes"
                : isDrug
                  ? "Special Instructions"
                  : "Notes"}
            </label>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm text-slate-800 placeholder:text-slate-400"
              placeholder={
                isService
                  ? "e.g., I have a persistent cough..."
                  : isDrug
                    ? "e.g., I need generic version if available"
                    : "e.g., I need the test done urgently"
              }
            />
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-sm border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (isService && !time)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Processing..." : submitLabel}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
});

// ---------- InfoWindowContent ----------
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
    <div className="p-3.5 max-w-[290px] sm:max-w-xs bg-white text-slate-800 font-sans rounded-2xl">
      {/* ─── HEADER: STATUS & DISTANCE ───────────────────────────── */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs shrink-0",
              status.classes,
            )}
          >
            {status.label}
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-[10px] font-bold text-slate-500 capitalize truncate">
            {place.centerType?.toLowerCase().replace("_", " ")}
          </span>
        </div>

        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60 shrink-0">
          {place.distance ? `${place.distance.toFixed(1)} km` : "Nearby"}
        </span>
      </div>

      {/* ─── CENTER NAME ────────────────────────────────────────── */}
      <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug tracking-tight mb-1.5 line-clamp-1">
        {place.centerName}
      </h4>

      {/* ─── BEYOND RANGE WARNING BANNER ────────────────────────── */}
      {isBeyond && (
        <div className="mb-2.5 flex items-center gap-1.5 bg-amber-50 text-amber-800 px-2.5 py-1.5 rounded-xl border border-amber-200/60">
          <AlertTriangle size={13} className="shrink-0 text-amber-600" />
          <span className="text-[10px] font-semibold leading-tight">
            {place.distance.toFixed(1)} km away (exceeds your {maxDistance}km
            radius)
          </span>
        </div>
      )}

      {/* ─── RATINGS & TOP REVIEW ───────────────────────────────── */}
      {place.ratings && place.ratings.count > 0 && (
        <div className="mb-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/50">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="font-bold text-xs text-slate-800">
                {place.ratings.average.toFixed(1)}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              ({place.ratings.count} reviews)
            </span>
          </div>

          {place.ratings.comments && place.ratings.comments.length > 0 && (
            <div className="text-[11px] text-slate-600 italic bg-slate-50/80 p-2 rounded-xl border border-slate-100 line-clamp-2">
              &ldquo;{place.ratings.comments[0].comment}&rdquo;
              <span className="text-slate-400 not-italic font-semibold ml-1">
                — {place.ratings.comments[0].userName}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ─── ADDRESS ────────────────────────────────────────────── */}
      <p className="text-xs text-slate-500 mb-3 flex items-start gap-1.5">
        <MapPin size={13} className="shrink-0 mt-0.5 text-slate-400" />
        <span className="line-clamp-2 leading-relaxed">
          {place.address || "Address not cataloged"}
        </span>
      </p>

      {/* ─── MATCHES LIST ───────────────────────────────────────── */}
      {place.matches && place.matches.length > 0 && (
        <div className="mb-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Available Matches
            </p>
            {place.matches.length > 2 && (
              <span className="text-[9px] font-bold text-emerald-600">
                +{place.matches.length - 2} more
              </span>
            )}
          </div>
          <div className="space-y-1 divide-y divide-slate-200/40">
            {place.matches.slice(0, 2).map((match) => {
              const displayPrice = Math.round(
                match.price * (1 + RETAIL_MARKUP_PERCENT / 100),
              );
              return (
                <div
                  key={match.id}
                  className="flex justify-between items-center text-xs pt-1 first:pt-0"
                >
                  <span className="truncate max-w-[140px] text-slate-700 font-medium">
                    {match.name}
                  </span>
                  <span className="font-extrabold text-emerald-600 shrink-0">
                    ₦{displayPrice.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── ACTION BUTTONS ─────────────────────────────────────── */}
      <div className="flex gap-2 pt-1.5 border-t border-slate-100">
        {place.phone && (
          <a
            href={`tel:${place.phone}`}
            className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-center text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            <Phone size={13} className="text-slate-600 shrink-0" />
            <span>Call</span>
          </a>
        )}

        <button
          onClick={() => onAction(firstMatch)}
          className={cn(
            "flex-1 py-2.5 px-3 text-white rounded-xl text-center text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-2xs",
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

// ---------- Result Card ----------
function ResultCard({
  result,
  isActive,
  maxDistance,
  onClick,
  onAction,
  actionLabel,
}: {
  result: SearchResult;
  isActive: boolean;
  maxDistance: number;
  onClick: () => void;
  onAction: (match?: MatchItem) => void;
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
        "w-full text-left p-4 sm:p-5 rounded-2xl md:rounded-3xl border transition-all cursor-pointer shadow-2xs relative overflow-hidden group",
        isActive
          ? "bg-emerald-950/90 border-emerald-500/80 text-white shadow-xl shadow-emerald-950/20 ring-2 ring-emerald-500/60 backdrop-blur-md"
          : isBeyond
            ? "bg-amber-50/40 border-amber-200/80 hover:border-amber-300"
            : "bg-white border-slate-200/70 hover:border-slate-300 hover:shadow-sm",
      )}
    >
      {/* Active Indicator Accent Line */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500" />
      )}

      <div className="flex items-start gap-3.5 sm:gap-4">
        {/* Center Avatar / Icon */}
        <div
          className={cn(
            "w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold text-base sm:text-lg shrink-0 shadow-2xs transition-transform group-hover:scale-105",
            isActive
              ? "bg-emerald-500 text-white shadow-emerald-500/30"
              : isBeyond
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-100 text-slate-700",
          )}
        >
          {result.centerName.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header Info: Name & Distance */}
          <div className="flex justify-between items-start gap-2 mb-1">
            <h4
              className={cn(
                "font-bold truncate text-sm sm:text-base tracking-tight",
                isActive ? "text-emerald-100" : "text-slate-900",
              )}
            >
              {result.centerName}
            </h4>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span
                className={cn(
                  "text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-lg border tracking-wide",
                  isActive
                    ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
                    : isBeyond
                      ? "bg-amber-100 border-amber-200 text-amber-800"
                      : "bg-slate-100 border-slate-200/60 text-slate-700",
                )}
              >
                {result.distance
                  ? `${result.distance.toFixed(1)} km`
                  : "Nearby"}
              </span>
              {isBeyond && (
                <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">
                  Beyond Range
                </span>
              )}
            </div>
          </div>

          {/* Status & Center Type Tags */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs",
                status.classes,
              )}
            >
              {status.label}
            </span>
            <span className={isActive ? "text-emerald-700" : "text-slate-300"}>
              •
            </span>
            <span
              className={cn(
                "text-xs font-medium capitalize truncate",
                isActive ? "text-emerald-300/80" : "text-slate-500",
              )}
            >
              {result.centerType?.toLowerCase().replace("_", " ")}
            </span>
          </div>

          {/* Ratings */}
          {result.ratings && result.ratings.count > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-md border",
                  isActive
                    ? "bg-emerald-900/60 border-emerald-700/50"
                    : "bg-amber-50 border-amber-200/50",
                )}
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span
                  className={cn(
                    "text-xs font-bold",
                    isActive ? "text-emerald-100" : "text-slate-800",
                  )}
                >
                  {result.ratings.average.toFixed(1)}
                </span>
              </div>
              <span
                className={cn(
                  "text-[11px]",
                  isActive ? "text-emerald-400/70" : "text-slate-400",
                )}
              >
                ({result.ratings.count} reviews)
              </span>
            </div>
          )}

          {/* Requested Resource / Match Box */}
          {firstMatch && (
            <div
              className={cn(
                "mt-3.5 pt-3.5 border-t flex flex-col gap-3",
                isActive ? "border-emerald-800/60" : "border-slate-100",
              )}
            >
              <div
                className={cn(
                  "flex justify-between items-center p-3 rounded-xl border",
                  isActive
                    ? "bg-emerald-900/40 border-emerald-700/40"
                    : "bg-slate-50/50 border-slate-200/40",
                )}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p
                    className={cn(
                      "text-[10px] uppercase font-bold tracking-wider mb-0.5",
                      isActive ? "text-emerald-400" : "text-slate-400",
                    )}
                  >
                    Requested Resource
                  </p>
                  <p
                    className={cn(
                      "text-xs sm:text-sm font-semibold truncate",
                      isActive ? "text-white" : "text-slate-800",
                    )}
                  >
                    {firstMatch.name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={cn(
                      "text-[10px] uppercase font-bold tracking-wider mb-0.5",
                      isActive ? "text-emerald-400/70" : "text-slate-400",
                    )}
                  >
                    Est. Retail Price
                  </p>
                  <p
                    className={cn(
                      "text-sm sm:text-base font-black tracking-tight",
                      isActive ? "text-emerald-300" : "text-emerald-600",
                    )}
                  >
                    ₦{estRetailPrice?.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(firstMatch);
                  }}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 shadow-xs flex items-center justify-center gap-2"
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
                    console.log("More info for:", result.centerId);
                  }}
                  className={cn(
                    "px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5",
                    isActive
                      ? "bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/50"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700",
                  )}
                  title="More Information"
                >
                  <Info className="w-4 h-4 shrink-0" />
                  <span className="hidden xs:inline">Info</span>
                </button>
              </div>
            </div>
          )}

          {/* Alternatives Count Banner */}
          {result.matches?.length > 1 && (
            <div
              className={cn(
                "mt-3 text-[11px] font-medium text-right flex items-center justify-end gap-1",
                isActive ? "text-emerald-300/80" : "text-slate-500",
              )}
            >
              <span
                className={cn(
                  "font-bold",
                  isActive ? "text-emerald-300" : "text-emerald-600",
                )}
              >
                +{result.matches.length - 1}
              </span>{" "}
              more alternatives available here
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ---------- Empty State ----------
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
      return `No ${searchType}s found matching "${searchQuery}" within ${maxDistance}km. Try expanding your distance or enabling "Show Beyond ${maxDistance}km".`;
    }
    if (showBeyondRange) {
      return `No ${searchType}s found within ${maxDistance}km or beyond. Try a different search type.`;
    }
    return `No ${searchType}s found within ${maxDistance}km. Try enabling "Show Beyond ${maxDistance}km" to see farther options.`;
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
        <Search className="w-6 h-6 text-slate-300" />
      </div>
      <h4 className="text-slate-800 font-bold text-sm mb-1">
        No Matches Found
      </h4>
      <p className="text-slate-400 text-xs leading-relaxed max-w-[240px]">
        {getMessage()}
      </p>
    </div>
  );
}

// ---------- Help Modal ----------
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
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 50, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 50, scale: 0.95 }}
        className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] max-w-sm w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-emerald-100">
            {slides[currentSlide].icon}
          </div>
          <h3
            className={cn(
              "text-2xl text-slate-900 mb-2 font-black tracking-tight",
              bebasNeue.className,
            )}
          >
            {slides[currentSlide].title}
          </h3>
          <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6 px-2">
            {slides[currentSlide].description}
          </p>
          <div className="flex justify-center gap-1.5 mb-6">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === currentSlide
                    ? "w-5 bg-slate-900"
                    : "w-1.5 bg-slate-200",
                )}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {currentSlide < slides.length - 1 ? (
              <button
                onClick={() => setSlide(currentSlide + 1)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={onClose}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition shadow-md"
              >
                Start Locating
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
