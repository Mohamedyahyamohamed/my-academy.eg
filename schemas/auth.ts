import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "البريد الإلكتروني مطلوب").email("أدخل بريدًا إلكترونيًا صالحًا"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const resetSchema = z.object({
  email: z.string().min(1, "البريد الإلكتروني مطلوب").email("أدخل بريدًا إلكترونيًا صالحًا"),
});
export type ResetValues = z.infer<typeof resetSchema>;
