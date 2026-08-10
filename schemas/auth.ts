import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const resetSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});
export type ResetValues = z.infer<typeof resetSchema>;
