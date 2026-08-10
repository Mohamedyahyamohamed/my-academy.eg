import { z } from "zod";

export const paymentSchema = z.object({
  student_id: z.string().min(1, "Select a student"),
  group_id: z.string().optional().nullable(),
  month: z.string().min(1, "Month is required"),
  amount_due: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .min(0, "Cannot be negative"),
  amount_paid: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .min(0, "Cannot be negative")
    .optional(),
  method: z.string().optional(),
  notes: z.string().max(500).optional(),
  due_date: z.string().optional(),
}).refine((d) => (d.amount_paid ?? 0) <= d.amount_due, {
  message: "Paid cannot exceed amount due",
  path: ["amount_paid"],
});

export type PaymentValues = z.infer<typeof paymentSchema>;

export const recordPaymentSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .min(1, "Amount must be positive"),
  method: z.string().min(1, "Select a method"),
  note: z.string().max(500).optional(),
});
export type RecordPaymentValues = z.infer<typeof recordPaymentSchema>;
