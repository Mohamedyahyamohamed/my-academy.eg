import { z } from "zod";

export const academySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z
    .string()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, "Invalid email"),
  phone: z.string().max(40).optional(),
  address: z.string().max(200).optional(),
  country: z.string().max(60).optional(),
  currency: z.string().max(10).optional(),
});
export type AcademyValues = z.infer<typeof academySchema>;

export const courseSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  description: z.string().max(500).optional(),
  color: z.string().min(1).max(9),
});
export type CourseValues = z.infer<typeof courseSchema>;
