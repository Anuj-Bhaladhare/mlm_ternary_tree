import { z } from "zod";

export const adminRegistrationSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    password: z.string().min(12).max(128),
    confirmPassword: z.string().min(12).max(128),
    secretKey: z.string().min(1).max(512),
  })
  .strict()
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export type AdminRegistrationInput = z.infer<typeof adminRegistrationSchema>;
