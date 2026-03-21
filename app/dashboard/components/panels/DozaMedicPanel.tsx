"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Star,
  Calendar,
  X,
  Loader2,
  Heart,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  Users,
  Pill,
  Smile,
  Briefcase,
  UserPlus,
  UserCheck,
  Clock,
  Award,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/app/utils/utils";
import { useFavorites } from "../../hooks/userFavourites";
import { authFetcher, authPost, authDelete } from "@/app/utils/client-auth";
import { poppins, bebasNeue } from "@/app/constants";

// Category badges with consistent emerald gradient
const categories = [
  { id: "doctor", label: "Doctors", icon: Stethoscope },
  { id: "nurse", label: "Nurses", icon: Users },
  { id: "pharmacist", label: "Pharmacists", icon: Pill },
  { id: "dentist", label: "Dentists", icon: Smile },
  { id: "therapist", label: "Therapists", icon: Heart },
  { id: "other", label: "Others", icon: Briefcase },
];

const bookingSchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  reason: z.string().min(1, "Reason is required"),
});

type BookingForm = z.infer<typeof bookingSchema>;

export default function DozaMedicsPanel() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("doctor");
  const [selectedMedic, setSelectedMedic] = useState<any>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpSlide, setHelpSlide] = useState(0);

  // Show help on first visit
  useState(() => {
    const hasSeenHelp = localStorage.getItem("doza_medics_help");
    if (!hasSeenHelp) {
      setShowHelp(true);
      localStorage.setItem("doza_medics_help", "true");
    }
  });

  const { favorites, mutateFavorites } = useFavorites();

  const { data, error, isLoading } = useSWR(
    `/api/medics?search=${encodeURIComponent(search)}&category=${selectedCategory}`,
    authFetcher,
  );
  const medics = data?.success ? data.data : [];

  const isFavorite = (medicId: string) =>
    favorites.some((fav: any) => fav.id === medicId);

  const toggleFavorite = async (medic: any) => {
    try {
      if (isFavorite(medic.id)) {
        await authDelete(`/api/user/favorites?medicId=${medic.id}`);
      } else {
        await authPost("/api/user/favorites", {
          medicId: medic.id,
          medicData: {
            name: medic.name,
            specialty: medic.specialty,
            profileImage: medic.profileImage,
            experience: medic.experience,
            rating: medic.rating,
          },
        });
      }
      mutateFavorites();
    } catch (error) {
      console.error("Failed to toggle favorite", error);
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { date: "", time: "", reason: "" },
  });

  const onBook = async (formData: BookingForm) => {
    if (!selectedMedic) return;
    try {
      const result = await authPost("/api/appointments", {
        ...formData,
        medicId: selectedMedic.id,
        medicName: selectedMedic.name,
      });
      if (result.success) {
        alert("Appointment booked successfully!");
        setShowBooking(false);
        setSelectedMedic(null);
        reset();
      } else {
        alert("Error: " + result.error);
      }
    } catch {
      alert("Failed to book appointment");
    }
  };

  const helpSlides = [
    {
      icon: <Search className="w-12 h-12 text-emerald-600" />,
      title: "Find professionals",
      description:
        "Search by name or specialty, or filter by category using the badges below.",
    },
    {
      icon: <Heart className="w-12 h-12 text-emerald-600" />,
      title: "Add to favorites",
      description:
        "Click the heart icon to save a medic to your list for quick access.",
    },
    {
      icon: <Calendar className="w-12 h-12 text-emerald-600" />,
      title: "Book appointments",
      description:
        "Book appointments directly from the medic's profile. You'll receive a confirmation.",
    },
    {
      icon: <Award className="w-12 h-12 text-emerald-600" />,
      title: "Experience & about",
      description:
        "View each medic's experience and biography to make an informed choice.",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-600">Error loading professionals</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "max-w-6xl mx-auto px-4 pb-28 min-h-screen",
        poppins.className,
      )}
    >
      {/* Header with help icon */}
      <div className="pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1
            className={cn(
              "text-3xl font-bold text-gray-800",
              bebasNeue.className,
            )}
          >
            Doza Medics
          </h1>
          <p className="text-sm text-emerald-600 mt-1">
            Find & connect with trusted professionals
          </p>
        </div>
        <button
          onClick={() => setShowHelp(true)}
          className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200 active:bg-gray-50"
        >
          <HelpCircle className="w-5 h-5 text-emerald-600" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by name or specialty..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder:text-gray-400"
        />
      </div>

      {/* Category Badges – pill grid */}
      <div className="mb-5">
        <h2
          className={cn(
            "text-xl font-semibold text-gray-800 mb-3 flex items-center gap-2",
            bebasNeue.className,
          )}
        >
          <Stethoscope className="w-5 h-5 text-emerald-600" />
          Browse by Category
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <motion.button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-full transition-all shadow-sm",
                  isActive
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium truncate">
                  {cat.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Favorites Section – horizontal scroll cards */}
      {favorites.length > 0 && (
        <div className="mb-6">
          <h2
            className={cn(
              "text-xl font-semibold text-gray-800 mb-3 flex items-center gap-2",
              bebasNeue.className,
            )}
          >
            <Heart className="w-5 h-5 text-emerald-600 fill-current" />
            My Favorite Medics
          </h2>
          <div className="overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex gap-3">
              {favorites.map((fav: any) => (
                <motion.div
                  key={fav.id}
                  whileHover={{ y: -2 }}
                  className="flex-shrink-0 w-48 bg-white border border-gray-200 rounded-2xl p-3 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {fav.profileImage ? (
                      <img
                        src={fav.profileImage}
                        alt={fav.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-emerald-100"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-lg font-bold">
                        {fav.name?.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {fav.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {fav.specialty}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-gray-700">
                      {fav.rating ? fav.rating.toFixed(1) : "N/A"}
                    </span>
                  </div>
                  {fav.experience && (
                    <p className="text-xs text-gray-500">
                      {fav.experience} years exp.
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      <div className="mb-4">
        <h2
          className={cn(
            "text-xl font-semibold text-gray-800 mb-3 flex items-center gap-2",
            bebasNeue.className,
          )}
        >
          <Stethoscope className="w-5 h-5 text-emerald-600" />
          Available Professionals
        </h2>
      </div>

      {medics.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-sm p-10 text-center text-gray-500 rounded-3xl border border-gray-200 shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Stethoscope className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-lg font-medium text-gray-700 mb-1">
            No professionals found
          </p>
          <p className="text-sm">Try adjusting your search or category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {medics.map((medic: any) => {
            const isFav = isFavorite(medic.id);
            return (
              <motion.div
                key={medic.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                whileHover={{ y: -2 }}
                className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all"
              >
                {/* Header: avatar + name + heart */}
                <div className="flex items-start gap-3 mb-3">
                  {medic.profileImage ? (
                    <img
                      src={medic.profileImage}
                      alt={medic.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-emerald-100"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-lg font-bold border-2 border-emerald-200">
                      {medic.name?.charAt(0) || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {medic.name}
                    </h3>
                    <p className="text-sm text-emerald-600 truncate">
                      {medic.specialty}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm text-gray-700">
                        {medic.rating ? medic.rating.toFixed(1) : "N/A"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFavorite(medic)}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition shrink-0"
                  >
                    <Heart
                      className={cn(
                        "w-5 h-5",
                        isFav
                          ? "fill-emerald-600 text-emerald-600"
                          : "text-gray-400",
                      )}
                    />
                  </button>
                </div>

                {/* Experience & About preview */}
                <div className="space-y-2 mb-3">
                  {medic.experience && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{medic.experience} years experience</span>
                    </div>
                  )}
                  {medic.bio && (
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {medic.bio}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedMedic(medic);
                      setShowBooking(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm"
                  >
                    <Calendar className="w-4 h-4" />
                    <span className="hidden xs:inline">Book</span>
                  </button>
                  <button
                    onClick={() => setSelectedMedic(medic)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition text-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden xs:inline">Profile</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Medic Detail Modal – shows full experience, about, education */}
      <AnimatePresence>
        {selectedMedic && !showBooking && (
          <Modal onClose={() => setSelectedMedic(null)}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-4">
                {selectedMedic.profileImage ? (
                  <img
                    src={selectedMedic.profileImage}
                    alt={selectedMedic.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-emerald-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-2xl font-bold border-2 border-emerald-200">
                    {selectedMedic.name?.charAt(0) || "?"}
                  </div>
                )}
                <div>
                  <h2
                    className={cn(
                      "text-xl font-semibold text-gray-900",
                      bebasNeue.className,
                    )}
                  >
                    {selectedMedic.name}
                  </h2>
                  <p className="text-emerald-600">{selectedMedic.specialty}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-gray-700">
                      {selectedMedic.rating
                        ? selectedMedic.rating.toFixed(1)
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedMedic(null)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4 text-gray-700">
              {selectedMedic.experience && (
                <div>
                  <h3 className="font-medium text-gray-900">Experience</h3>
                  <p className="text-sm text-gray-600">
                    {selectedMedic.experience} years
                  </p>
                </div>
              )}
              {selectedMedic.education?.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900">Education</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {selectedMedic.education.map((edu: string, idx: number) => (
                      <li key={idx}>{edu}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedMedic.bio && (
                <div>
                  <h3 className="font-medium text-gray-900">About</h3>
                  <p className="text-sm text-gray-600">{selectedMedic.bio}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowBooking(true);
                }}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-medium"
              >
                Book Appointment
              </button>
              <button
                onClick={() => toggleFavorite(selectedMedic)}
                className={cn(
                  "flex-1 py-2 rounded-xl transition font-medium",
                  isFavorite(selectedMedic.id)
                    ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                )}
              >
                {isFavorite(selectedMedic.id)
                  ? "Remove from list"
                  : "Add to list"}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedMedic && showBooking && (
          <Modal
            onClose={() => {
              setShowBooking(false);
              setSelectedMedic(null);
            }}
          >
            <h2
              className={cn(
                "text-xl font-semibold text-gray-900 mb-4",
                bebasNeue.className,
              )}
            >
              Book with {selectedMedic.name}
            </h2>
            <form onSubmit={handleSubmit(onBook)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    {...register("date")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
                  />
                  {errors.date && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.date.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    {...register("time")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
                  />
                  {errors.time && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.time.message}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <textarea
                  {...register("reason")}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
                />
                {errors.reason && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.reason.message}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBooking(false);
                    setSelectedMedic(null);
                  }}
                  className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Help Carousel Modal */}
      <AnimatePresence>
        {showHelp && (
          <Modal onClose={() => setShowHelp(false)}>
            <div className="flex items-center justify-between mb-4">
              <h2
                className={cn(
                  "text-xl font-bold text-gray-900 flex items-center gap-2",
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
                <X className="w-5 h-5 text-gray-500" />
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
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                    {helpSlides[helpSlide].icon}
                  </div>
                  <h3 className="text-base font-semibold text-gray-800 mb-1">
                    {helpSlides[helpSlide].title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {helpSlides[helpSlide].description}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="flex justify-center gap-2 mt-4">
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
              className="mt-5 w-full px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
            >
              Get Started
            </button>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Reusable Modal (same as dashboard)
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
