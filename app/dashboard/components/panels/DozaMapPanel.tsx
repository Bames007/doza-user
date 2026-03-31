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
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import { useUserLocation } from "../../hooks/useUserLocation";
import { useCenterSearch } from "../../hooks/useCenterSearch";
import { poppins, bebasNeue } from "@/app/constants";

const DEFAULT_CENTER = { lat: 6.5244, lng: 3.3792 };
const SURCHARGE_PERCENT = 15; // markup for retail price

const searchTabs = [
  { id: "service", label: "Services", icon: Stethoscope },
  { id: "drug", label: "Drugs", icon: Pill },
  { id: "test", label: "Lab Tests", icon: FlaskConical },
] as const;

export default function DozaMapPanel() {
  const { location: userLocation, loading: locationLoading } =
    useUserLocation();

  const [mapCenter, setMapCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchType, setSearchType] = useState<"service" | "drug" | "test">(
    "service",
  );
  const [maxDistance, setMaxDistance] = useState(50);
  const [showOpenNow, setShowOpenNow] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpSlide, setHelpSlide] = useState(0);
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { results, isLoading, error } = useCenterSearch(
    debouncedQuery,
    searchType,
    maxDistance,
    userLocation,
  );

  const filteredResults = useMemo(() => {
    let res = results || [];
    if (showOpenNow) {
      res = res.filter((r) => isOpenNow(r.operatingHours) === true);
    }
    return res;
  }, [results, showOpenNow]);

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
      className={cn("h-screen flex flex-col bg-[#F8FAFC]", poppins.className)}
    >
      {/* Header */}
      <header className="px-4 pt-6 pb-2 max-w-7xl mx-auto w-full z-30">
        <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] -mr-32 -mt-32 rounded-full" />
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <h1
                className={cn(
                  "text-4xl text-white tracking-tighter uppercase",
                  bebasNeue.className,
                )}
              >
                Medical <span className="text-emerald-400">Locator</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  System Live: Nigeria
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowHelp(true)}
              className="p-3 bg-white/5 rounded-2xl text-emerald-400 hover:bg-white/10 transition-all"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <section className="px-4 py-4 max-w-7xl mx-auto w-full z-30">
        <div className="bg-white/70 backdrop-blur-2xl border-2 border-white rounded-[2rem] p-3 shadow-xl shadow-slate-200/50">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder={`Search for ${searchType}s...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-bold text-sm transition-all"
              />
            </div>

            <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem]">
              {searchTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSearchType(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                    searchType === tab.id
                      ? "bg-white text-emerald-600 shadow-sm"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 px-2">
              <div className="flex items-center gap-2 bg-slate-100 px-4 py-3 rounded-2xl">
                <Navigation className="w-4 h-4 text-slate-400" />
                <select
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  className="bg-transparent text-[11px] font-black uppercase tracking-widest text-slate-600 focus:outline-none"
                >
                  <option value={10}>10 KM</option>
                  <option value={20}>20 KM</option>
                  <option value={50}>50 KM</option>
                </select>
              </div>

              <button
                onClick={() => setShowOpenNow(!showOpenNow)}
                className={cn(
                  "px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border-2",
                  showOpenNow
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "bg-white border-slate-100 text-slate-400",
                )}
              >
                Open Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Interface */}
      <main className="flex-1 flex flex-col md:flex-row gap-6 px-4 pb-6 max-w-7xl mx-auto w-full min-h-0 overflow-hidden">
        {/* Results Sidebar */}
        <aside
          className={cn(
            "md:w-[400px] flex flex-col bg-white rounded-[2.5rem] border border-slate-100 shadow-sm transition-all duration-500 overflow-hidden",
            isFullscreenMap ? "hidden md:flex" : "flex h-[45vh] md:h-auto",
          )}
        >
          <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                Available Centers
              </p>
              <h3
                className={cn(
                  "text-2xl text-slate-900 tracking-tight",
                  bebasNeue.className,
                )}
              >
                Discovery <span className="text-emerald-500">Result</span>
              </h3>
            </div>
            <div className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full uppercase tracking-tighter">
              {filteredResults.length} Found
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {isLoading ? (
              <LoadingState />
            ) : error ? (
              <div className="p-6 text-center text-red-500 text-sm">
                {error}
              </div>
            ) : filteredResults.length === 0 ? (
              <EmptyState />
            ) : (
              filteredResults.map((result) => (
                <ResultCard
                  key={result.centerId}
                  result={result}
                  isActive={selectedPlace?.centerId === result.centerId}
                  onClick={() => {
                    setSelectedPlace(result);
                    setMapCenter(result.location);
                    setIsFullscreenMap(false);
                  }}
                />
              ))
            )}
          </div>
        </aside>

        {/* Map View */}
        <section className="flex-1 relative rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl bg-slate-200">
          {apiKey && mapCenter && (
            <APIProvider apiKey={apiKey}>
              <Map
                center={mapCenter}
                zoom={14}
                disableDefaultUI
                gestureHandling="greedy"
                className="w-full h-full"
              >
                {filteredResults.map((result) => (
                  <Marker
                    key={result.centerId}
                    position={result.location}
                    onClick={() => setSelectedPlace(result)}
                  />
                ))}
                {selectedPlace && (
                  <InfoWindow
                    position={selectedPlace.location}
                    onCloseClick={() => setSelectedPlace(null)}
                    pixelOffset={[0, -40]}
                  >
                    <div className="p-3 min-w-[240px] max-w-[320px] bg-white rounded-xl shadow-xl border border-slate-200">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">
                        {selectedPlace.centerType?.replace("_", " ")}
                      </p>
                      <h4 className="font-bold text-slate-900 text-sm mb-2">
                        {selectedPlace.centerName}
                      </h4>
                      {selectedPlace.address && (
                        <div className="flex items-start gap-1 text-[10px] text-slate-500 mb-2">
                          <MapPin size={12} className="shrink-0 mt-0.5" />
                          <span className="line-clamp-2">
                            {selectedPlace.address}
                          </span>
                        </div>
                      )}
                      {selectedPlace.matches &&
                        selectedPlace.matches.length > 0 && (
                          <div className="mb-3">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                              Matches
                            </p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {selectedPlace.matches
                                .slice(0, 3)
                                .map((match: any) => (
                                  <div
                                    key={match.id}
                                    className="flex justify-between items-center text-xs border-b border-slate-100 pb-1"
                                  >
                                    <span className="truncate max-w-[140px] font-medium">
                                      {match.name}
                                    </span>
                                    <span className="font-bold text-emerald-700">
                                      ₦{match.price?.toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              {selectedPlace.matches.length > 3 && (
                                <p className="text-[9px] text-slate-400 italic">
                                  +{selectedPlace.matches.length - 3} more
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      <div className="flex gap-2 mt-3 pt-2 border-t border-slate-100">
                        <a
                          href={`tel:${selectedPlace.phone}`}
                          className="flex-1 bg-slate-900 text-white py-2 rounded-lg text-center text-[10px] font-bold hover:bg-emerald-700 transition"
                        >
                          Call Now
                        </a>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          )}

          <button
            onClick={() => setIsFullscreenMap(!isFullscreenMap)}
            className="absolute bottom-6 right-6 p-4 bg-white text-slate-900 rounded-2xl shadow-2xl z-10 hover:scale-105 transition-all"
          >
            {isFullscreenMap ? (
              <Minimize2 size={20} />
            ) : (
              <Maximize2 size={20} />
            )}
          </button>
        </section>
      </main>

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
}

// --- Subcomponents ---

function ResultCard({ result, isActive, onClick }: any) {
  const firstMatch = result.matches?.[0];
  const surchargedPrice = firstMatch
    ? Math.round(firstMatch.price * (1 + SURCHARGE_PERCENT / 100))
    : null;

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "w-full text-left p-5 rounded-[2rem] border-2 transition-all group",
        isActive
          ? "bg-slate-900 border-slate-900 shadow-xl shadow-slate-200"
          : "bg-white border-slate-50 hover:border-emerald-200",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0",
            isActive
              ? "bg-emerald-500 text-white"
              : "bg-slate-100 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500",
          )}
        >
          {result.centerName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <h4
              className={cn(
                "font-bold truncate text-sm",
                isActive ? "text-white" : "text-slate-900",
              )}
            >
              {result.centerName}
            </h4>
            <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full uppercase">
              {result.distance !== null ? `${result.distance}km` : "N/A"}
            </span>
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider",
              isActive ? "text-slate-400" : "text-slate-500",
            )}
          >
            <MapPin size={10} />
            {result.centerType?.replace("_", " ")}
          </div>
          {firstMatch && (
            <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
              <span
                className={cn(
                  "text-[10px] italic font-medium",
                  isActive ? "text-slate-500" : "text-slate-400",
                )}
              >
                {firstMatch.name}
              </span>
              <span
                className={cn(
                  "text-xs font-black flex items-center gap-1",
                  isActive ? "text-emerald-400" : "text-slate-900",
                )}
              >
                ₦{surchargedPrice?.toLocaleString()}
              </span>
            </div>
          )}
          {result.matches?.length > 1 && (
            <p
              className={cn(
                "text-[9px] mt-2",
                isActive ? "text-slate-500" : "text-slate-400",
              )}
            >
              +{result.matches.length - 1} more
            </p>
          )}
        </div>
      </div>
    </motion.button>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3 p-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-32 bg-slate-50 rounded-[2rem] animate-pulse flex items-center px-6 gap-4"
        >
          <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded-full w-3/4" />
            <div className="h-3 bg-slate-200 rounded-full w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
      <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6">
        <Search className="w-8 h-8 text-slate-200" />
      </div>
      <h4 className="text-slate-900 font-bold mb-2 uppercase tracking-tighter">
        No Centers Found
      </h4>
      <p className="text-slate-400 text-xs leading-relaxed">
        Adjust your radius or try searching for a more general medical term.
      </p>
    </div>
  );
}

function HelpModal({ slides, onClose, currentSlide, setSlide }: any) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[3rem] max-w-sm w-full p-10 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/30 text-white">
            {slides[currentSlide].icon}
          </div>
          <h3
            className={cn(
              "text-3xl font-black text-slate-900 mb-3 uppercase tracking-tighter",
              bebasNeue.className,
            )}
          >
            {slides[currentSlide].title}
          </h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed mb-10">
            {slides[currentSlide].description}
          </p>
          <button
            onClick={onClose}
            className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-emerald-600 transition-all"
          >
            Start Locating
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Helper functions
function isOpenNow(hours?: any) {
  if (!hours?.opening || !hours?.closing || !hours?.days) return null;
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
  if (!hours.days.includes(days[now.getDay()])) return false;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [oH, oM] = hours.opening.split(":").map(Number);
  const [cH, cM] = hours.closing.split(":").map(Number);
  return currentMinutes >= oH * 60 + oM && currentMinutes <= cH * 60 + cM;
}

const helpSlides = [
  {
    icon: <Search className="w-8 h-8" />,
    title: "Medical Discovery",
    description:
      "Enter any drug or service name. We scan the database for real-time inventory and pricing.",
  },
  {
    icon: <Navigation className="w-8 h-8" />,
    title: "Radius Scan",
    description:
      "Adjust the search radius to find results close to your current GPS position.",
  },
  {
    icon: <MapPin className="w-8 h-8" />,
    title: "Secure Routing",
    description:
      "Select a result to see the precise location and contact the center directly via phone.",
  },
];
