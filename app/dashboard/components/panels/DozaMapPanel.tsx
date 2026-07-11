"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import { useUserLocation } from "../../hooks/useUserLocation";
import { useCenterSearch } from "../../hooks/useCenterSearch";
import { poppins, bebasNeue } from "@/app/constants";

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
  isBeyondRange?: boolean; // Flag for results outside selected radius
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

// ---------- Constants & Configuration ----------
const DEFAULT_CENTER = { lat: 6.5244, lng: 3.3792 }; // Lagos, Nigeria
const RETAIL_MARKUP_PERCENT = 15; // Fair operational buffer markup

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

// ---------- Pure Helper Functions ----------
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

// Format distance display
function formatDistance(distance: number, isBeyondRange: boolean): string {
  if (isBeyondRange) {
    return `${distance.toFixed(1)} km (Beyond range)`;
  }
  return `${distance.toFixed(1)} km`;
}

// ---------- UI Skeleton Loaders ----------
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

// ---------- Main Core Component ----------
export default function DozaMapPanel() {
  const { location: userLocation, loading: locationLoading } =
    useUserLocation();

  const [mapCenter, setMapCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SearchResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("service");
  const [maxDistance, setMaxDistance] = useState(50);
  const [showOpenNow, setShowOpenNow] = useState(false);
  const [showBeyondRange, setShowBeyondRange] = useState(false); // Toggle for beyond range results
  const [showHelp, setShowHelp] = useState(false);
  const [helpSlide, setHelpSlide] = useState(0);
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);

  const { results, isLoading, error } = useCenterSearch(
    searchQuery,
    searchType,
    maxDistance,
    userLocation,
  );

  // Split results into within range and beyond range
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

  // Filter results based on showBeyondRange toggle
  const filteredResults = useMemo(() => {
    let res = [...withinRange];

    if (showBeyondRange) {
      res = [...res, ...beyondRange];
    }

    if (showOpenNow) {
      res = res.filter((r: SearchResult) => {
        const status = getStatusLabel(r.operatingHours);
        return status.label === "Open Now";
      });
    }

    // Sort by distance (closest first)
    return res.sort((a, b) => a.distance - b.distance);
  }, [withinRange, beyondRange, showOpenNow, showBeyondRange]);

  useEffect(() => {
    if (userLocation) {
      setMapCenter(userLocation);
    } else if (!locationLoading) {
      setMapCenter(DEFAULT_CENTER);
    }
  }, [userLocation, locationLoading]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col bg-[#F8FAFC] antialiased",
        poppins.className,
      )}
    >
      {/* Top Banner & Title Area */}
      <header className="w-full px-4 pt-4 md:pt-6 pb-2 max-w-7xl mx-auto z-30">
        <div className="bg-slate-900 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-[60px] -mr-16 -mt-16 rounded-full" />
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <h1
                className={cn(
                  "text-3xl md:text-4xl text-white tracking-tight uppercase font-black",
                  bebasNeue.className,
                )}
              >
                Medical <span className="text-emerald-400">Locator</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  Nigeria
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setHelpSlide(0);
                setShowHelp(true);
              }}
              className="p-3 bg-white/5 border border-white/10 rounded-2xl text-emerald-400 hover:bg-white/10 active:scale-95 transition-all"
              aria-label="Help Guide"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Smart Search Filter Hub */}
      <section className="w-full px-4 py-2 max-w-7xl mx-auto z-30 space-y-3">
        <div className="bg-white border border-slate-100 rounded-3xl p-3 shadow-md">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Input Wrapper */}
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </div>

              <input
                ref={inputRef}
                type="text"
                placeholder={
                  searchType === "service"
                    ? "Search checkups, consultations, surgeries..."
                    : searchType === "drug"
                      ? "Search tablets, syrups, insulin generics..."
                      : "Search blood tests, scans, x-rays..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 text-slate-800 font-semibold text-sm transition-all outline-none placeholder:text-slate-400"
              />

              {/* Clear button - appears when there's text */}
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Custom Interactive Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100/80 p-1 rounded-2xl overflow-x-auto">
              {searchTabs.map((tab) => {
                const TabIcon = tab.icon;
                const isSelected = searchType === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setSearchType(tab.id);
                    }}
                    className={cn(
                      "flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[10px] sm:text-xs font-bold tracking-tight transition-all",
                      isSelected
                        ? "bg-white text-slate-900 shadow-sm font-extrabold"
                        : "text-slate-500 hover:text-slate-800",
                    )}
                  >
                    <TabIcon
                      className={cn(
                        "w-3.5 h-3.5",
                        isSelected ? tab.color : "text-slate-400",
                      )}
                    />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Radius and Status Toggles */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 sm:flex-initial flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-3 rounded-2xl">
                <Navigation className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none w-full"
                >
                  <option value={5}>Within 5 KM</option>
                  <option value={10}>Within 10 KM</option>
                  <option value={20}>Within 20 KM</option>
                  <option value={50}>Within 50 KM</option>
                  <option value={100}>Within 100 KM</option>
                  <option value={200}>Within 200 KM</option>
                  <option value={500}>Within 500 KM</option>
                </select>
              </div>

              <button
                onClick={() => setShowOpenNow(!showOpenNow)}
                className={cn(
                  "flex-1 sm:flex-initial text-center py-3 px-4 rounded-2xl text-xs font-bold border transition-all",
                  showOpenNow
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-600/10"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                )}
              >
                Open Now
              </button>

              {/* Beyond Range Toggle */}
              <button
                onClick={() => setShowBeyondRange(!showBeyondRange)}
                className={cn(
                  "flex-1 sm:flex-initial text-center py-3 px-4 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5",
                  showBeyondRange
                    ? "bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-500/10"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Show Beyond {maxDistance}km</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Framework View */}
      <main className="flex-1 flex flex-col md:flex-row gap-4 px-4 pb-4 max-w-7xl w-full mx-auto min-h-0 overflow-hidden relative">
        {/* Responsive Drawer & Sidebar */}
        <aside
          className={cn(
            "bg-white rounded-3xl border border-slate-100 shadow-sm transition-all duration-300 z-20 flex flex-col shrink-0 overflow-hidden",
            isFullscreenMap
              ? "hidden md:flex md:w-[380px]"
              : "w-full md:w-[380px]",
            isSidebarExpanded ? "h-[50vh] md:h-auto flex-1" : "h-14 md:h-auto",
          )}
        >
          {/* Sidebar Drawer Controller Header */}
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
              {/* Mobile Only expansion arrows */}
              <button className="md:hidden text-slate-400 p-1">
                {isSidebarExpanded ? (
                  <ChevronDown size={18} />
                ) : (
                  <ChevronUp size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Scrolling Result Body Stack */}
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
                />
              ))
            )}
          </div>
        </aside>

        {/* Visual Map Render Pane */}
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
                {/* Within range markers - Green/Emerald */}
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

                {/* Beyond range markers - Amber/Yellow (only if toggle is on) */}
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
                    />
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          )}

          {/* Fullscreen Map Toggle Switch */}
          <button
            onClick={() => setIsFullscreenMap(!isFullscreenMap)}
            className="absolute bottom-4 right-4 p-3 bg-slate-900 text-white rounded-xl shadow-lg z-10 hover:bg-slate-800 active:scale-95 transition-all hidden md:block"
            title={isFullscreenMap ? "Show Sidebar List" : "Maximize Map Area"}
          >
            {isFullscreenMap ? (
              <Minimize2 size={18} />
            ) : (
              <Maximize2 size={18} />
            )}
          </button>

          {/* Legend for map markers */}
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

      {/* Guide Modals Layer */}
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
}

// ---------- Isolated Child Components ----------

function InfoWindowContent({
  place,
  maxDistance,
}: {
  place: SearchResult;
  maxDistance: number;
}) {
  const status = getStatusLabel(place.operatingHours);
  const isBeyond = place.distance > maxDistance;

  return (
    <div className="p-1 max-w-[280px] bg-white text-slate-800">
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className={cn(
            "text-[9px] font-extrabold px-2 py-0.5 rounded-md",
            status.classes,
          )}
        >
          {status.label}
        </span>
        <span className="text-[9px] font-bold text-slate-400 capitalize">
          {place.centerType?.toLowerCase().replace("_", " ")}
        </span>
      </div>

      <h4 className="font-bold text-slate-900 text-sm leading-tight mb-1">
        {place.centerName}
      </h4>

      {/* Distance warning if beyond range */}
      {isBeyond && (
        <div className="mb-2 flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-lg">
          <AlertTriangle size={10} />
          <span className="text-[9px] font-bold">
            {place.distance.toFixed(1)} km away (beyond your {maxDistance}km
            limit)
          </span>
        </div>
      )}

      <p className="text-[11px] text-slate-500 mb-2 flex items-start gap-1">
        <MapPin size={12} className="shrink-0 mt-0.5 text-slate-400" />
        <span className="line-clamp-2">
          {place.address || "Address not cataloged"}
        </span>
      </p>

      {place.matches && place.matches.length > 0 && (
        <div className="mb-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
            Found Item Matches
          </p>
          <div className="space-y-1">
            {place.matches.slice(0, 2).map((match) => {
              const displayPrice = Math.round(
                match.price * (1 + RETAIL_MARKUP_PERCENT / 100),
              );
              return (
                <div
                  key={match.id}
                  className="flex justify-between items-center text-xs"
                >
                  <span className="truncate max-w-[130px] text-slate-600 font-medium">
                    {match.name}
                  </span>
                  <span className="font-extrabold text-slate-900">
                    ₦{displayPrice.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <a
        href={`tel:${place.phone}`}
        className={cn(
          "w-full py-2 px-3 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-2 transition",
          isBeyond
            ? "bg-amber-500 hover:bg-amber-600 text-white"
            : "bg-emerald-600 hover:bg-emerald-700 text-white",
        )}
      >
        <Phone size={12} />
        <span>Call Medical Desk</span>
      </a>
    </div>
  );
}

function ResultCard({
  result,
  isActive,
  maxDistance,
  onClick,
}: {
  result: SearchResult;
  isActive: boolean;
  maxDistance: number;
  onClick: () => void;
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
        "w-full text-left p-4 rounded-2xl border transition-all cursor-pointer",
        isActive
          ? "bg-slate-900 border-slate-900 shadow-lg shadow-slate-900/10"
          : isBeyond
            ? "bg-amber-50/30 border-amber-100 hover:border-amber-200"
            : "bg-white border-slate-100 hover:border-slate-200",
      )}
    >
      <div className="flex gap-3">
        {/* Dynamic Typography Initial Icon */}
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0",
            isActive
              ? "bg-emerald-500 text-white"
              : isBeyond
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-500",
          )}
        >
          {result.centerName.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2 mb-1">
            <h4
              className={cn(
                "font-bold truncate text-sm leading-tight",
                isActive ? "text-white" : "text-slate-900",
              )}
            >
              {result.centerName}
            </h4>
            <div className="flex flex-col items-end gap-0.5">
              <span
                className={cn(
                  "text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 border",
                  isActive
                    ? "bg-white/10 border-transparent text-emerald-400"
                    : isBeyond
                      ? "bg-amber-100 border-amber-200 text-amber-700"
                      : "bg-slate-50 border-slate-100 text-slate-600",
                )}
              >
                {result.distance
                  ? `${result.distance.toFixed(1)} km`
                  : "Nearby"}
              </span>
              {isBeyond && (
                <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wider">
                  Beyond Range
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span
              className={cn(
                "text-[9px] font-extrabold px-1.5 py-0.5 rounded",
                status.classes,
              )}
            >
              {status.label}
            </span>
            <span
              className={cn(
                "text-[10px] font-medium capitalize truncate",
                isActive ? "text-slate-400" : "text-slate-500",
              )}
            >
              {result.centerType?.toLowerCase().replace("_", " ")}
            </span>
          </div>

          {/* Pricing Box Segment */}
          {firstMatch && (
            <div
              className={cn(
                "mt-3 pt-3 border-t flex justify-between items-center",
                isActive ? "border-white/10" : "border-slate-50",
              )}
            >
              <div className="min-w-0 flex-1 pr-2">
                <p
                  className={cn(
                    "text-[9px] uppercase font-bold tracking-wider",
                    isActive ? "text-slate-500" : "text-slate-400",
                  )}
                >
                  Requested Resource
                </p>
                <p
                  className={cn(
                    "text-xs font-semibold truncate",
                    isActive ? "text-white" : "text-slate-700",
                  )}
                >
                  {firstMatch.name}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p
                  className={cn(
                    "text-[9px] uppercase font-bold tracking-wider",
                    isActive ? "text-slate-500" : "text-slate-400",
                  )}
                >
                  Est. Retail Price
                </p>
                <p
                  className={cn(
                    "text-sm font-black",
                    isActive ? "text-emerald-400" : "text-emerald-600",
                  )}
                >
                  ₦{estRetailPrice?.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {result.matches?.length > 1 && (
            <p
              className={cn(
                "text-[10px] mt-2 font-medium text-right",
                isActive ? "text-slate-400" : "text-slate-400",
              )}
            >
              +{result.matches.length - 1} more alternatives here
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

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

          {/* Slider Pagination Indicator Pip Dots */}
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
