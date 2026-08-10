import { z } from "zod";

export const lessonSchema = z.object({
  group_id: z.string().min(1, "Select a group"),
  teacher_id: z.string().min(1, "Select a teacher"),
  date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  topic: z.string().min(1, "Topic is required").max(120),
  description: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
}).refine((d) => d.end_time > d.start_time, {
  message: "End time must be after start time",
  path: ["end_time"],
});

export type LessonValues = z.infer<typeof lessonSchema>;
