import { z } from "zod";

export const studentSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(60),
  last_name: z.string().min(1, "Last name is required").max(60),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || /^[+]?[\d\s()-]{6,20}$/.test(v), "Invalid phone"),
  email: z
    .string()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, "Invalid email"),
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(["male", "female"]).optional().nullable(),
  parent_id: z
    .string()
    .optional()
    .nullable(),
  school: z.string().max(100).optional(),
  grade: z.string().max(60).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
  groupIds: z.array(z.string()).optional(),
  consent_given: z.boolean().refine((v) => v === true, "Parent consent is required"),
});

export type StudentValues = z.infer<typeof studentSchema>;
