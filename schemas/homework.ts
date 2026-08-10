import { z } from "zod";

export const homeworkSchema = z.object({
  title: z.string().min(1, "Title is required").max(140),
  description: z.string().min(1, "Description is required").max(2000),
  group_id: z.string().min(1, "Select a group"),
  lesson_id: z.string().optional().nullable(),
  deadline: z.string().min(1, "Deadline is required"),
});

export type HomeworkValues = z.infer<typeof homeworkSchema>;

export const submissionSchema = z.object({
  content: z.string().max(5000).optional(),
});
export type SubmissionValues = z.infer<typeof submissionSchema>;
