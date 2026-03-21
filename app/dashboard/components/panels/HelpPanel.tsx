"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Mail,
  Send,
  Loader2,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  BookOpen,
  Phone,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authPost } from "@/app/utils/client-auth";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";

const faqs = [
  {
    category: "General",
    questions: [
      {
        q: "How do I add health records?",
        a: 'Go to Health Tracker and click "Add Record". Fill in the details and save.',
      },
      {
        q: "Can I share my data with family?",
        a: "Yes, in Settings you can enable sharing with family members.",
      },
    ],
  },
  {
    category: "Appointments",
    questions: [
      {
        q: "How do I book an appointment?",
        a: 'Visit Doza Medics, search for a doctor, and click "Book Appointment".',
      },
      {
        q: "How do I cancel an appointment?",
        a: "Go to Appointments, select the appointment, and click Cancel.",
      },
    ],
  },
  {
    category: "Privacy & Security",
    questions: [
      {
        q: "Is my data secure?",
        a: "Absolutely. We use Firebase security rules and encryption.",
      },
      {
        q: "Can I delete my account?",
        a: "Yes, contact support and we'll assist you.",
      },
    ],
  },
];

const supportSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type SupportForm = z.infer<typeof supportSchema>;

export default function HelpPanel() {
  const [openFaq, setOpenFaq] = useState<{
    categoryIdx: number;
    qIdx: number;
  } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpSlide, setHelpSlide] = useState(0);

  useEffect(() => {
    const hasSeenHelp = localStorage.getItem("doza_help_help");
    if (!hasSeenHelp) {
      setShowHelp(true);
      localStorage.setItem("doza_help_help", "true");
    }
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupportForm>({
    resolver: zodResolver(supportSchema),
  });

  const onSubmit = async (data: SupportForm) => {
    try {
      const result = await authPost("/api/support", data);
      if (result.success) {
        setSubmitted(true);
        reset();
        setTimeout(() => setSubmitted(false), 5000);
      } else {
        alert("Error: " + result.error);
      }
    } catch {
      alert("Failed to send message");
    }
  };

  const helpSlides = [
    {
      icon: <BookOpen className="w-12 h-12 text-emerald-600" />,
      title: "Browse FAQs",
      description: "Find answers to common questions, organized by category.",
    },
    {
      icon: <MessageCircle className="w-12 h-12 text-emerald-600" />,
      title: "Contact support",
      description:
        "Fill out the form and we'll get back to you within 24 hours.",
    },
    {
      icon: <Phone className="w-12 h-12 text-emerald-600" />,
      title: "Emergency?",
      description:
        "For urgent issues, please call emergency services directly.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("min-h-screen px-4 py-6 md:p-6 pb-28", poppins.className)}
    >
      <div className="max-w-5xl mx-auto">
        {/* Top Banner */}
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6 md:p-8">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <HelpCircle className="w-12 h-12 text-white/90" />
              <div>
                <h2
                  className={cn(
                    "text-3xl md:text-5xl font-bold",
                    bebasNeue.className,
                  )}
                >
                  Help & Support
                </h2>
                <p className="text-white/80 text-sm max-w-md">
                  Find answers to common questions or get in touch with our
                  support team.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition min-h-[44px]"
            >
              <HelpCircle className="w-4 h-4" />
              <span>How to use</span>
            </button>
          </div>
        </div>

        <h1
          className={cn(
            "text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2",
            bebasNeue.className,
          )}
        >
          <MessageCircle className="w-6 h-6 text-emerald-600" />
          How can we help you?
        </h1>

        {/* FAQ Accordion by Category */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-md mb-6">
          <h2
            className={cn(
              "text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800",
              bebasNeue.className,
            )}
          >
            <BookOpen className="w-5 h-5 text-emerald-600" /> Frequently Asked
            Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((category, catIdx) => (
              <div
                key={catIdx}
                className="border border-gray-100 rounded-lg overflow-hidden"
              >
                <h3 className="bg-gray-50 px-4 py-2 font-medium text-gray-700 text-sm">
                  {category.category}
                </h3>
                <div className="divide-y divide-gray-100">
                  {category.questions.map((faq, qIdx) => {
                    const isOpen =
                      openFaq?.categoryIdx === catIdx && openFaq?.qIdx === qIdx;
                    return (
                      <div key={qIdx} className="px-4">
                        <button
                          onClick={() =>
                            setOpenFaq(
                              isOpen ? null : { categoryIdx: catIdx, qIdx },
                            )
                          }
                          className="flex justify-between items-center w-full text-left py-3 font-medium text-gray-900"
                        >
                          {faq.q}
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                        {isOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="text-gray-600 pb-3"
                          >
                            {faq.a}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-md">
          <h2
            className={cn(
              "text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800",
              bebasNeue.className,
            )}
          >
            <Send className="w-5 h-5 text-emerald-600" /> Contact Support
          </h2>
          {submitted ? (
            <div className="bg-green-100 text-green-700 p-6 rounded-lg text-center">
              <Mail className="w-12 h-12 mx-auto mb-3 text-green-600" />
              <p className="font-medium text-lg">Your message has been sent!</p>
              <p className="text-sm mt-1">
                We'll get back to you within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    {...register("name")}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    {...register("email")}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  {...register("message")}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
                />
                {errors.message && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.message.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition shadow-md min-h-[44px]"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Send Message
              </button>
            </form>
          )}
        </div>

        {/* Help Carousel Modal */}
        <AnimatePresence>
          {showHelp && (
            <Modal onClose={() => setShowHelp(false)}>
              <div className="flex items-center justify-between mb-6">
                <h2
                  className={cn(
                    "text-2xl font-bold text-gray-900 flex items-center gap-2",
                    bebasNeue.className,
                  )}
                >
                  <HelpCircle className="w-6 h-6 text-emerald-600" />
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
                    className="flex flex-col items-center text-center p-4"
                  >
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                      {helpSlides[helpSlide].icon}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      {helpSlides[helpSlide].title}
                    </h3>
                    <p className="text-gray-600">
                      {helpSlides[helpSlide].description}
                    </p>
                  </motion.div>
                </AnimatePresence>

                <div className="flex justify-center gap-2 mt-6">
                  {helpSlides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setHelpSlide(idx)}
                      className={cn(
                        "w-2 h-2 rounded-full transition",
                        idx === helpSlide
                          ? "bg-emerald-600 w-4"
                          : "bg-gray-300",
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
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() =>
                    setHelpSlide((prev) =>
                      prev === helpSlides.length - 1 ? 0 : prev + 1,
                    )
                  }
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-1 bg-gray-100 rounded-full hover:bg-gray-200"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <button
                onClick={() => setShowHelp(false)}
                className="mt-8 w-full px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 min-h-[44px]"
              >
                Get Started
              </button>
            </Modal>
          )}
        </AnimatePresence>
      </div>
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
    className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.95, y: 10 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.95, y: 10 }}
      className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </motion.div>
  </motion.div>
);
