/** Zod schemas for every user-facing form. */

import { z } from "zod";

export const analyzeSchema = z.object({
  resume_text: z.string().trim().min(80, "The resume is too short to analyze; paste or upload a full resume."),
  job_description: z.string().trim().min(80, "The job description is too short; paste the full posting."),
  job_title: z.string().trim().max(200).optional().or(z.literal("")),
  company: z.string().trim().max(200).optional().or(z.literal("")),
  model: z.enum(["traditional", "transformer", "compare"]),
});
export type AnalyzeInput = z.infer<typeof analyzeSchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Please enter a valid email address."),
  subject: z.string().trim().max(200).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Please write a message of at least 10 characters."),
});
export type ContactInput = z.infer<typeof contactSchema>;
