import { z } from "zod";

export const challengeSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters"),
    activity: z.string().min(1, "Select an activity"),
    targetValue: z.coerce.number().positive("Target must be positive"),
    targetUnit: z.string().min(1, "Select unit"),
    startDate: z.string().min(1, "Start date required"),
    endDate: z.string().min(1, "End date required"),
    isPublic: z.boolean(),
    imageUrl: z.string().optional(),
    invitedEmails: z.string().optional(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export const commentSchema = z.object({
  text: z.string().min(1, "Comment cannot be empty"),
});

export type ChallengeForm = z.infer<typeof challengeSchema>;
export type CommentForm = z.infer<typeof commentSchema>;
