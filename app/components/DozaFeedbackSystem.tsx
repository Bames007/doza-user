// components/FeedbackModal.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  X,
  Camera,
  Send,
  User,
  Ghost,
  CheckCircle2,
  StopCircle,
  Star,
  Activity,
  Mail,
  Phone,
  Loader2,
} from "lucide-react";
import html2canvas from "html2canvas";
import { useUser } from "@/app/dashboard/hooks/useProfile";
import { authPost } from "@/app/utils/client-auth";
import { cn } from "@/app/utils/utils";
import { poppins } from "@/app/constants";

export default function FeedbackModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState({
    name: user?.fullName || "",
    email: user?.email || "",
    phone: "",
  });

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  const isRecognitionStarted = useRef(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  // Speech recognition setup
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      setError("Speech recognition not supported in this browser.");
      return;
    }
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = "en-US";

    recognitionRef.current.onresult = (event: any) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }
      setFeedbackText(finalTranscriptRef.current + interimTranscript);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
      isRecognitionStarted.current = false;
      setError("Speech recognition failed. Please type your feedback.");
    };

    recognitionRef.current.onend = () => {
      if (isRecording && isOpen) {
        if (!isRecognitionStarted.current) {
          try {
            recognitionRef.current?.start();
            isRecognitionStarted.current = true;
          } catch (e) {
            console.error("Failed to restart recognition:", e);
            setIsRecording(false);
          }
        }
      } else {
        isRecognitionStarted.current = false;
      }
    };
  }, [isOpen]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      setError("Speech recognition not supported in this browser.");
      return;
    }
    if (isRecording) {
      try {
        recognitionRef.current.stop();
        setIsRecording(false);
        isRecognitionStarted.current = false;
      } catch (e) {
        console.error("Stop failed:", e);
      }
    } else {
      if (isRecognitionStarted.current) return;
      finalTranscriptRef.current = feedbackText + (feedbackText ? " " : "");
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        isRecognitionStarted.current = true;
        setError(null);
      } catch (e) {
        console.error("Start failed:", e);
        setError("Could not start speech recognition.");
      }
    }
  };

  const captureScreenshot = async () => {
    setIsCapturing(true);
    const modalElement = document.getElementById("doza-feedback-card");
    if (modalElement) modalElement.style.visibility = "hidden";

    try {
      await new Promise((r) => setTimeout(r, 100));
      const canvas = await html2canvas(document.body, {
        scale: 1,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      setScreenshot(canvas.toDataURL("image/png"));
    } catch (err) {
      console.error("Screenshot failed:", err);
      setError("Could not capture screenshot. Please try again.");
    } finally {
      if (modalElement) modalElement.style.visibility = "visible";
      setIsCapturing(false);
    }
  };

  const handleSubmit = async () => {
    if (!feedbackText.trim() && rating === 0 && !screenshot) {
      setError("Please provide at least a rating, feedback, or screenshot.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const payload = {
      rating,
      text: feedbackText,
      screenshot: screenshot || null,
      anonymous: isAnonymous,
      contact: isAnonymous
        ? null
        : {
            name: contactInfo.name,
            email: contactInfo.email,
            phone: contactInfo.phone,
          },
      timestamp: new Date().toISOString(),
    };

    try {
      const result = await authPost("/api/feedback", payload);
      if (result.success) {
        setStep(3);
        setTimeout(() => {
          setRating(0);
          setFeedbackText("");
          setScreenshot(null);
          setIsAnonymous(false);
          // Don't reset contact info – keep it for next time
        }, 100);
      } else {
        setError(result.error || "Submission failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsRecording(false);
      isRecognitionStarted.current = false;
    }
    setStep(1);
    setRating(0);
    setFeedbackText("");
    setScreenshot(null);
    setIsAnonymous(false);
    setError(null);
    onClose();
  };

  const renderStars = () => (
    <div className="flex justify-center gap-1 mb-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating(star)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              "w-8 h-8 transition-colors",
              star <= rating
                ? "fill-emerald-500 text-emerald-500"
                : "text-slate-300 fill-transparent",
            )}
          />
        </button>
      ))}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            id="doza-feedback-card"
            data-screenshot-safe="true"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "bg-white w-full max-w-[460px] rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden",
              poppins.className,
            )}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                  <img
                    src="/logo.png"
                    alt="Doza"
                    className="w-6 h-6 object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-[16px] font-black text-slate-900 uppercase tracking-tighter leading-none italic">
                    DOZA
                  </h2>
                  <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-[0.2em] mt-1">
                    Your Personal Medical Assistant
                  </p>
                </div>
              </div>
              <button
                onClick={resetAndClose}
                className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {step === 1 ? (
                <div className="text-center py-4 space-y-4">
                  <Activity size={44} className="text-emerald-600 mx-auto" />
                  <h3 className="text-xl font-bold text-slate-900 leading-tight">
                    Help Us Improve Care
                  </h3>
                  <p className="text-slate-500 text-sm px-6">
                    Your insights go directly to our product team to refine your
                    experience.
                  </p>
                  <button
                    onClick={() => setStep(2)}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm tracking-widest uppercase hover:bg-emerald-700 transition-all"
                  >
                    New Feedback
                  </button>
                </div>
              ) : step === 2 ? (
                <div className="space-y-4">
                  {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium">
                      {error}
                    </div>
                  )}

                  {/* Rating */}
                  <div className="text-center">
                    {renderStars()}
                    <p className="text-xs text-slate-500">
                      How would you rate your experience?
                    </p>
                  </div>

                  {/* Anonymous Switch */}
                  <div
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center",
                      isAnonymous
                        ? "border-slate-200 bg-slate-50"
                        : "border-emerald-200 bg-emerald-50/20",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {isAnonymous ? (
                        <Ghost className="text-slate-400" size={18} />
                      ) : (
                        <User className="text-emerald-600" size={18} />
                      )}
                      <span className="text-[13px] font-bold text-slate-800">
                        {isAnonymous
                          ? "Submit Anonymously"
                          : `Share as ${contactInfo.name || "You"}`}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-4 transition-colors",
                        isAnonymous
                          ? "border-slate-300"
                          : "bg-emerald-600 border-emerald-100",
                      )}
                    />
                  </div>

                  {/* Contact Fields (only if not anonymous) */}
                  {!isAnonymous && (
                    <div className="space-y-2">
                      <div className="relative">
                        <User
                          className="absolute left-4 top-3.5 text-slate-500"
                          size={14}
                        />
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={contactInfo.name}
                          onChange={(e) =>
                            setContactInfo({
                              ...contactInfo,
                              name: e.target.value,
                            })
                          }
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 transition-all outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <Mail
                            className="absolute left-4 top-3.5 text-slate-500"
                            size={14}
                          />
                          <input
                            type="email"
                            placeholder="Email"
                            value={contactInfo.email}
                            onChange={(e) =>
                              setContactInfo({
                                ...contactInfo,
                                email: e.target.value,
                              })
                            }
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="relative">
                          <Phone
                            className="absolute left-4 top-3.5 text-slate-500"
                            size={14}
                          />
                          <input
                            type="tel"
                            placeholder="Phone"
                            value={contactInfo.phone}
                            onChange={(e) =>
                              setContactInfo({
                                ...contactInfo,
                                phone: e.target.value,
                              })
                            }
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Textarea with speech and screenshot */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 focus-within:bg-white focus-within:border-emerald-500 transition-all">
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="What's on your mind? (Tap the mic to speak)"
                      className="w-full bg-transparent border-none focus:ring-0 text-slate-900 text-sm font-medium min-h-[100px] resize-none"
                    />
                    <div className="flex justify-between items-center mt-2 pt-3 border-t border-slate-100">
                      <div className="flex gap-2">
                        {isSpeechSupported && (
                          <button
                            onClick={toggleRecording}
                            className={cn(
                              "p-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2",
                              isRecording
                                ? "bg-red-500 text-white animate-pulse"
                                : "bg-white text-slate-500 hover:text-emerald-600 border border-slate-100",
                            )}
                          >
                            {isRecording ? (
                              <StopCircle size={18} />
                            ) : (
                              <Mic size={18} />
                            )}
                            {isRecording && (
                              <span className="text-[10px] font-bold uppercase">
                                Listening...
                              </span>
                            )}
                          </button>
                        )}
                        <button
                          onClick={captureScreenshot}
                          disabled={isCapturing}
                          className={cn(
                            "p-2.5 rounded-xl shadow-sm bg-white border border-slate-100 text-slate-500 hover:text-emerald-600",
                            screenshot &&
                              "text-emerald-600 border-emerald-200 bg-emerald-50",
                          )}
                        >
                          {isCapturing ? (
                            <div className="w-4 h-4 border-2 border-t-emerald-600 rounded-full animate-spin" />
                          ) : (
                            <Camera size={18} />
                          )}
                        </button>
                      </div>
                      {screenshot && (
                        <div className="text-[10px] font-bold text-emerald-700 bg-emerald-100/50 px-2 py-1 rounded border border-emerald-200">
                          System Snapshot Attached
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold uppercase tracking-widest text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        Submit Feedback <Send size={16} />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={40} className="text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    Feedback Received
                  </h3>
                  <p className="text-sm text-slate-500 px-6 leading-relaxed">
                    Thank you for your pulse. Our team will review this and get
                    back to you shortly.
                  </p>
                  <button
                    onClick={resetAndClose}
                    className="px-10 py-3 bg-slate-900 text-white rounded-full font-bold text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all"
                  >
                    Close Modal
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
