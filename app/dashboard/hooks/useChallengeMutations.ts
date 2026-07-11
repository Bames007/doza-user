"use client";

import { useState } from "react";
import { mutate } from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authPost } from "@/app/utils/client-auth";
import { challengeSchema, commentSchema } from "@/app/types/schemas";
import { UserInfo } from "./useProfile";

export function useChallengeMutations(user: UserInfo | null) {
  const [joinCode, setJoinCode] = useState("");
  const [selectedImage, setSelectedImage] = useState("");

  const challengeForm = useForm({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      isPublic: true,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      targetValue: 0,
      activity: "",
      description: "",
      name: "",
      imageUrl: "",
      targetUnit: "",
      invitedEmails: "",
    },
  });

  const commentForm = useForm({
    resolver: zodResolver(commentSchema),
  });

  const handleCreateChallenge = async (data: any) => {
    const payload = {
      ...data,
      imageUrl: selectedImage || undefined,
      creatorName: user?.fullName || "Anonymous",
      creatorPhoto: user?.avatar || null,
    };
    const result = await authPost("/api/challenges", payload);
    if (result.success) {
      mutate("/api/challenges?type=my");
      mutate("/api/challenges?visibility=public");
      return true;
    }
    alert("Error: " + result.error);
    return false;
  };

  const handleJoin = async (challengeId: string, isPublic: boolean) => {
    const endpoint = isPublic
      ? `/api/challenges/${challengeId}/join`
      : `/api/challenges/${challengeId}/request`;
    const result = await authPost(endpoint, {
      userName: user?.fullName || "Anonymous",
      userPhoto: user?.avatar || null,
    });
    if (result.success) {
      mutate(`/api/challenges/${challengeId}`);
      mutate("/api/challenges?type=my");
      mutate("/api/challenges?visibility=public");
      if (!isPublic) mutate("/api/challenges/requests");
    } else {
      alert("Error: " + (result.error || "Failed to join"));
    }
  };

  const handleJoinByCode = async (): Promise<boolean> => {
    if (!joinCode.trim()) return false;
    try {
      const result = await authPost("/api/challenges/join-by-code", {
        code: joinCode,
      });
      if (result.success) {
        mutate("/api/challenges?type=my");
        setJoinCode("");
        return true;
      }
      alert("Error: " + (result.error || "Invalid code"));
      return false;
    } catch {
      alert("Failed to join by code");
      return false;
    }
  };

  const handleLeave = async (challengeId: string) => {
    if (!confirm("Are you sure you want to leave this challenge?")) return;
    const result = await authPost(`/api/challenges/${challengeId}/leave`, {});
    if (result.success) {
      mutate("/api/challenges?type=my");
      mutate("/api/challenges?visibility=public");
    } else {
      alert("Error: " + result.error);
    }
  };

  const handleApprove = async (challengeId: string, userId: string) => {
    const result = await authPost(`/api/challenges/${challengeId}/approve`, {
      userId,
    });
    if (result.success) {
      mutate(`/api/challenges/${challengeId}`);
      mutate("/api/challenges/requests");
    } else {
      alert("Error: " + result.error);
    }
  };

  const handleProgressUpdate = async (
    challengeId: string,
    progress: number,
  ) => {
    const result = await authPost(`/api/challenges/${challengeId}/progress`, {
      progress,
    });
    if (result.success) {
      mutate(`/api/challenges/${challengeId}`);
    } else {
      alert("Error: " + (result.error || "Failed to update progress"));
    }
  };

  const handleAddComment = async (challengeId: string, data: any) => {
    const result = await authPost(
      `/api/challenges/${challengeId}/comments`,
      data,
    );
    if (result.success) {
      mutate(`/api/challenges/${challengeId}`);
    } else {
      alert("Error: " + (result.error || "Failed to add comment"));
    }
  };

  return {
    joinCode,
    setJoinCode,
    selectedImage,
    setSelectedImage,
    challengeForm,
    commentForm,
    handleCreateChallenge,
    handleJoin,
    handleJoinByCode,
    handleLeave,
    handleApprove,
    handleProgressUpdate,
    handleAddComment,
  };
}
