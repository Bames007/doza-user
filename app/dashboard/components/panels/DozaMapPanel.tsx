"use client";

import { useState, useEffect, useMemo } from "react";
import {
  APIProvider,
  Map,
  Marker,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Hospital,
  Pill,
  Stethoscope,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Phone,
  MapPin,
  Clock,
  Navigation,
  Calendar,
  FlaskConical,
  Eye,
  Maximize2,
  Minimize2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import { useUserLocation } from "../../hooks/useUserLocation";
import { useCenterSearch } from "../../hooks/useCenterSearch";
import { poppins, bebasNeue } from "@/app/constants";

// Default center (Lagos, Nigeria) as fallback
const DEFAULT_CENTER = { lat: 6.5244, lng: 3.3792 };

// ---------- Types ----------
interface SearchResult {
  centerId: string;
  centerName: string;
  centerType:
    | "hospital"
    | "pharmacy"
    | "clinic"
    | "diagnostic_lab"
    | "optical_center";
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  operatingHours?: {
    opening?: string;
    closing?: string;
    days?: string[];
  };
  distance: number;
  location: { lat: number; lng: number };
  matches: Array<{
    type: string;
    id: string;
    name: string;
    price?: number;
    unit?: string;
    inStock?: boolean;
    duration?: number;
  }>;
}

// ---------- Constants ----------
const SURCHARGE_PERCENT = 15;

const typeIcons = {
  hospital: Hospital,
  pharmacy: Pill,
  clinic: Stethoscope,
  diagnostic_lab: FlaskConical,
  optical_center: Eye,
};

const typeColors: Record<string, string> = {
  hospital: "red",
  pharmacy: "blue",
  clinic: "green",
  diagnostic_lab: "purple",
  optical_center: "orange",
};

const searchTabs = [
  { id: "service", label: "Services", icon: Stethoscope },
  { id: "drug", label: "Drugs", icon: Pill },
  { id: "test", label: "Lab Tests", icon: FlaskConical },
] as const;

// ---------- Helper ----------
const isOpenNow = (hours?: {
  opening?: string;
  closing?: string;
  days?: string[];
}) => {
  if (!hours?.opening || !hours?.closing || !hours?.days) return null;
  const now = new Date();
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const today = dayNames[now.getDay()];
  if (!hours.days.includes(today)) return false;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMin] = hours.opening.split(":").map(Number);
  const [closeHour, closeMin] = hours.closing.split(":").map(Number);
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
};

// ---------- Main Component ----------
export default function DozaMapPanel() {
  const { location: userLocation, loading: locationLoading } =
    useUserLocation();
  const [mapCenter, setMapCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SearchResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"service" | "drug" | "test">(
    "service",
  );
  const [maxDistance, setMaxDistance] = useState(50);
  const [showOpenNow, setShowOpenNow] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpSlide, setHelpSlide] = useState(0);
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const [mapError, setMapError] = useState(false);

  const { results, isLoading } = useCenterSearch(
    searchQuery,
    searchType,
    maxDistance,
  );

  const filteredResults = useMemo(() => {
    if (!showOpenNow) return results;
    return results.filter((r: any) => isOpenNow(r.operatingHours) === true);
  }, [results, showOpenNow]);

  // Set map center to user location or fallback
  useEffect(() => {
    if (userLocation) {
      setMapCenter(userLocation);
      setMapError(false);
    } else if (!locationLoading) {
      // Use default if location failed or not available
      setMapCenter(DEFAULT_CENTER);
    }
  }, [userLocation, locationLoading]);

  // First‑visit help
  useEffect(() => {
    const hasSeen = localStorage.getItem("doza_map_help");
    if (!hasSeen) {
      setShowHelp(true);
      localStorage.setItem("doza_map_help", "true");
    }
  }, []);

  const helpSlides = [
    {
      icon: <Search className="w-12 h-12 text-emerald-600" />,
      title: "Search for anything",
      description:
        "Find services (e.g., surgery), drugs (e.g., Panadol), or lab tests near you.",
    },
    {
      icon: <Filter className="w-12 h-12 text-emerald-600" />,
      title: "Filter results",
      description: "Adjust distance or show only places open now.",
    },
    {
      icon: <MapPin className="w-12 h-12 text-emerald-600" />,
      title: "Get details & directions",
      description:
        "Tap a marker to see contact info, prices, and get directions.",
    },
  ];

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("h-full flex flex-col ", poppins.className)}
    >
      {/* Top Banner */}
      <div className="relative mb-4 mx-4 mt-4 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-3 md:mb-0">
            <div>
              <h2
                className={cn(
                  "text-2xl sm:text-3xl font-bold",
                  bebasNeue.className,
                )}
              >
                Find Medical Services
              </h2>
              <p
                className={`text-white/80 text-xs sm:text-sm max-w-md ${poppins.className}`}
              >
                Search for services, drugs, or lab tests – see which centers
                offer them, their prices, and get directions.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition text-xs sm:text-sm min-h-[44px]"
          >
            <HelpCircle className="w-4 h-4" />
            <span>How to use</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Tabs */}
      <div className="px-4 mb-4">
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm min-h-[44px] placeholder:text-gray-400"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition min-h-[44px] md:hidden"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mt-3 pb-1 overflow-x-auto gap-2 scrollbar-hide">
            {searchTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSearchType(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap",
                    searchType === tab.id
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Filters (desktop) */}
          <div className="hidden md:flex items-center gap-4 mt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Max distance:</span>
              <select
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-900"
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100 km</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={showOpenNow}
                onChange={(e) => setShowOpenNow(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              Open now
            </label>
          </div>
        </div>

        {/* Mobile filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden mt-3 bg-white border border-gray-200 rounded-xl p-3"
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Max distance
                  </label>
                  <select
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900"
                  >
                    <option value={5}>5 km</option>
                    <option value={10}>10 km</option>
                    <option value={20}>20 km</option>
                    <option value={50}>50 km</option>
                    <option value={100}>100 km</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={showOpenNow}
                    onChange={(e) => setShowOpenNow(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  Open now
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main content - flex row on desktop, column on mobile */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 px-4 pb-4 min-h-0">
        {/* Results list – collapsible on mobile */}
        <div
          className={cn(
            "md:w-80 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col transition-all",
            isFullscreenMap ? "hidden md:flex" : "flex",
            "min-h-[200px] md:min-h-0",
          )}
        >
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3
              className={cn(
                "text-sm font-semibold text-gray-800",
                bebasNeue.className,
              )}
            >
              Results{" "}
              {filteredResults.length > 0 && `(${filteredResults.length})`}
            </h3>
            <button
              onClick={() => setIsFullscreenMap(true)}
              className="md:hidden p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg"
              aria-label="Show fullscreen map"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              </div>
            ) : filteredResults.length === 0 ? (
              <p className="text-gray-500 text-xs text-center py-8">
                {searchQuery ? "No matches found" : "Start typing to search"}
              </p>
            ) : (
              filteredResults.map((result: any) => (
                <button
                  key={result.centerId}
                  onClick={() => {
                    setSelectedPlace(result);
                    setMapCenter(result.location);
                    setIsFullscreenMap(false); // show list again after selection
                  }}
                  className={cn(
                    "w-full text-left p-2 rounded-lg border transition",
                    selectedPlace?.centerId === result.centerId
                      ? "bg-emerald-50 border-emerald-300"
                      : "bg-white border-gray-100 hover:bg-gray-50",
                  )}
                >
                  <div className="flex items-start gap-2">
                    {result.logo ? (
                      <img
                        src={result.logo}
                        alt={result.centerName}
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold">
                        {result.centerName.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800 text-xs truncate">
                        {result.centerName}
                      </h4>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {result.distance
                          ? `${result.distance} km`
                          : "Distance unknown"}
                      </p>
                      {result.matches.length > 0 && (
                        <div className="mt-1 text-[10px]">
                          <span className="text-emerald-600 font-medium">
                            {result.matches[0].name}
                          </span>
                          {result.matches[0].price && (
                            <span className="text-gray-600 ml-1">
                              ₦
                              {Math.round(
                                result.matches[0].price *
                                  (1 + SURCHARGE_PERCENT / 100),
                              ).toLocaleString()}
                            </span>
                          )}
                          {result.matches.length > 1 && (
                            <span className="text-gray-400 ml-1">
                              +{result.matches.length - 1}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Map */}
        <div
          className={cn(
            "flex-1 relative rounded-xl shadow-lg bg-gray-100 transition-all",
            "min-h-[300px] md:min-h-0",
            selectedPlace && "min-h-[450px] md:min-h-0", // give more space when InfoWindow open
          )}
        >
          {locationLoading && !mapCenter && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="ml-2 text-sm text-gray-600">
                Getting your location...
              </span>
            </div>
          )}

          {!apiKey && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center p-4">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-gray-700">
                  Google Maps API key is missing.
                </p>
                <p className="text-xs text-gray-500">
                  Please check your environment variables.
                </p>
              </div>
            </div>
          )}

          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center p-4">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-gray-700">Failed to load the map.</p>
                <p className="text-xs text-gray-500">
                  Please check your API key and try again.
                </p>
              </div>
            </div>
          )}

          {apiKey && mapCenter && (
            <APIProvider apiKey={apiKey} onError={() => setMapError(true)}>
              <Map
                center={mapCenter}
                zoom={13}
                gestureHandling="greedy"
                fullscreenControl
                mapTypeControl={false}
                streetViewControl={false}
                className="w-full h-full"
              >
                {/* User location */}
                {userLocation && (
                  <Marker
                    position={userLocation}
                    icon={{
                      url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                    }}
                  />
                )}

                {/* Result markers */}
                {filteredResults.map((result: any) => {
                  const color = typeColors[result.centerType] || "gray";
                  return (
                    <Marker
                      key={result.centerId}
                      position={result.location}
                      onClick={() => {
                        setSelectedPlace(result);
                        setMapCenter(result.location);
                      }}
                      icon={{
                        url: `https://maps.google.com/mapfiles/ms/icons/${color}-dot.png`,
                      }}
                    />
                  );
                })}

                {/* Info window with improved mobile positioning */}
                {selectedPlace && (
                  <InfoWindow
                    position={selectedPlace.location}
                    onCloseClick={() => setSelectedPlace(null)}
                    pixelOffset={[0, -20]} // shift up more to avoid marker
                    maxWidth={240} // limit width on mobile
                  >
                    <div className="p-2 max-w-[220px] text-gray-900">
                      <div className="flex items-start gap-2 mb-2">
                        {selectedPlace.logo ? (
                          <img
                            src={selectedPlace.logo}
                            alt={selectedPlace.centerName}
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 text-base font-bold">
                            {selectedPlace.centerName.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-gray-800 truncate">
                            {selectedPlace.centerName}
                          </h3>
                          <p className="text-[10px] text-gray-500 capitalize truncate">
                            {selectedPlace.centerType.replace("_", " ")}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span className="break-words">
                          {selectedPlace.address}
                        </span>
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        📍 {selectedPlace.distance} km away
                      </p>

                      {selectedPlace.operatingHours && (
                        <p className="text-xs text-gray-600 mt-1 flex items-start gap-1 flex-wrap">
                          <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>
                            {selectedPlace.operatingHours.opening} –{" "}
                            {selectedPlace.operatingHours.closing}
                            {isOpenNow(selectedPlace.operatingHours) && (
                              <span className="ml-1 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                Open now
                              </span>
                            )}
                          </span>
                        </p>
                      )}

                      {selectedPlace.matches.length > 0 && (
                        <div className="mt-2 border-t border-gray-100 pt-2">
                          <p className="text-[10px] font-medium text-gray-700 mb-1">
                            {searchType === "drug"
                              ? "Available drugs"
                              : searchType === "service"
                                ? "Services"
                                : "Tests"}
                            :
                          </p>
                          {selectedPlace.matches.slice(0, 3).map((match) => (
                            <div
                              key={match.id}
                              className="flex justify-between text-[10px]"
                            >
                              <span className="text-gray-600 truncate max-w-[120px]">
                                {match.name}
                              </span>
                              {match.price && (
                                <span className="font-medium text-emerald-700 whitespace-nowrap ml-2">
                                  ₦
                                  {Math.round(
                                    match.price * (1 + SURCHARGE_PERCENT / 100),
                                  ).toLocaleString()}
                                  {match.unit && `/${match.unit}`}
                                </span>
                              )}
                            </div>
                          ))}
                          {selectedPlace.matches.length > 3 && (
                            <p className="text-[10px] text-gray-400 mt-1">
                              +{selectedPlace.matches.length - 3} more
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedPlace.phone && (
                          <a
                            href={`tel:${selectedPlace.phone}`}
                            className="flex-1 py-2 bg-emerald-600 text-white text-[10px] rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-1 min-h-[36px]"
                          >
                            <Phone className="w-3 h-3" /> Call
                          </a>
                        )}
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.location.lat},${selectedPlace.location.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 bg-gray-200 text-gray-800 text-[10px] rounded-lg hover:bg-gray-300 flex items-center justify-center gap-1 min-h-[36px]"
                        >
                          <Navigation className="w-3 h-3" /> Directions
                        </a>
                      </div>

                      {/* Booking placeholder */}
                      <button className="mt-2 w-full py-2 bg-blue-600 text-white text-[10px] rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1 min-h-[36px]">
                        <Calendar className="w-3 h-3" /> Book Appointment
                      </button>
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          )}

          {/* Fullscreen toggle button (mobile) */}
          {isFullscreenMap && (
            <button
              onClick={() => setIsFullscreenMap(false)}
              className="absolute top-3 right-3 md:hidden bg-white rounded-full p-2 shadow-lg z-10"
              aria-label="Show results list"
            >
              <Minimize2 className="w-4 h-4 text-gray-700" />
            </button>
          )}
        </div>
      </div>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <Modal onClose={() => setShowHelp(false)}>
            <div className="flex items-center justify-between mb-3">
              <h2
                className={cn(
                  "text-lg font-bold text-gray-900 flex items-center gap-2",
                  bebasNeue.className,
                )}
              >
                <HelpCircle className="w-5 h-5 text-emerald-600" />
                How to use
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={helpSlide}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center text-center p-2"
                >
                  <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-2">
                    {helpSlides[helpSlide].icon}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">
                    {helpSlides[helpSlide].title}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {helpSlides[helpSlide].description}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="flex justify-center gap-2 mt-3">
                {helpSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setHelpSlide(idx)}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition",
                      idx === helpSlide ? "bg-emerald-600 w-3" : "bg-gray-300",
                    )}
                  />
                ))}
              </div>

              <button
                onClick={() =>
                  setHelpSlide((prev) =>
                    prev === 0 ? helpSlides.length - 1 : prev - 1,
                  )
                }
                className="absolute left-0 top-1/2 -translate-y-1/2 p-1 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() =>
                  setHelpSlide((prev) =>
                    prev === helpSlides.length - 1 ? 0 : prev + 1,
                  )
                }
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm"
            >
              Get Started
            </button>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const Modal = ({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.95, y: 10 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.95, y: 10 }}
      className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </motion.div>
  </motion.div>
);
