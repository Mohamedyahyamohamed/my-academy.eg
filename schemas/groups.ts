import { z } from "zod";

export const groupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100),
  course_id: z.string().min(1, "Select a course"),
  teacher_id: z.string().min(1, "Select a teacher"),
  monthly_fee: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .min(0, "Fee cannot be negative"),
  schedule: z.string().min(1, "Schedule is required").max(120),
  room: z.string().max(60).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type GroupValues = z.infer<typeof groupSchema>;
