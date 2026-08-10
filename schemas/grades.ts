import { z } from "zod";

export const examSchema = z.object({
  name: z.string().min(1, "Exam name is required").max(120),
  course_id: z.string().min(1, "Select a course"),
  group_id: z.string().min(1, "Select a group"),
  date: z.string().min(1, "Date is required"),
  max_score: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .min(1, "Maximum score must be at least 1"),
});

export type ExamValues = z.infer<typeof examSchema>;
