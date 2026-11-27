import { z } from "zod";

/**
 * The only shape we accept from the grader. Gemini is asked to answer with
 * exactly this JSON (responseMimeType + responseSchema), and we re-validate it
 * with zod before anything is written to the database.
 */
export const gradingResponseSchema = z.object({
  score: z.number(),
  feedback_en: z.string().trim().min(1).max(4000),
  feedback_ar: z.string().trim().min(1).max(4000),
  issues: z.array(z.string().trim().min(1).max(400)).max(10),
});

export type GradingResponse = z.infer<typeof gradingResponseSchema>;

/** Binary files (images, PDFs) sent to Gemini as inline data. */
export type GradingAttachment = {
  name: string;
  mimeType: string;
  data: string;
  label?: string;
};

export type GradingInput = {
  title: string;
  description: string;
  rubric: string;
  expectedOutput: string | null;
  maxScore: number;
  code: string;
  taskFileText?: string | null;
  attachments?: GradingAttachment[];
};
