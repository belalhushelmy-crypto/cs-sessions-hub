import { z } from "zod";

export const usernamePattern = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export const usernameSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(usernamePattern);

export const fullNameSchema = z.string().trim().min(2).max(80);

export const passwordSchema = z.string().min(8).max(72);

export const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(200),
});

export const createStudentSchema = z.object({
  username: usernameSchema,
  full_name: fullNameSchema,
  password: passwordSchema,
});

export const csvStudentSchema = z.object({
  username: usernameSchema,
  full_name: fullNameSchema,
  password: passwordSchema.optional(),
});

export const resetPasswordSchema = z.object({
  student_id: z.string().uuid(),
  password: passwordSchema,
});

export const profileSchema = z.object({
  display_name: z.string().trim().min(2).max(40),
  opted_out_of_leaderboard: z.boolean(),
});

export const signupSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  username: z.string().trim().min(3).max(20).regex(/^[a-z0-9_]{3,20}$/),
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  confirm_password: z.string().min(8).max(72),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  token: z.string().regex(/^\d{6,8}$/),
});

export const sessionDateSchema = z.iso.date();

export const sessionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  session_date: sessionDateSchema,
});

export const attendanceCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4,12}$/);

export const checkInSchema = z.object({
  code: attendanceCodeSchema,
});

export const rotateCodeSchema = z.object({
  session_id: z.string().uuid(),
  minutes: z.coerce.number().int().min(1).max(240),
});

export const attendanceStatusSchema = z.enum(["present", "late", "absent", "excused"]);
export type AttendanceStatusValue = z.infer<typeof attendanceStatusSchema>;

export const idSchema = z.string().uuid();

/* -------------------------------------------------------------------------- */
/* Phase 3: assignments, uploads and grading                                  */
/* -------------------------------------------------------------------------- */

/** Matches the storage bucket limit (10 MB) for uploaded files. */
export const MAX_SUBMISSION_BYTES = 10 * 1024 * 1024;
export const MAX_SUBMISSION_CHARS = 100_000;

export const SUBMISSION_FILE_EXTENSIONS = [
  ".py", ".ipynb", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf",
] as const;

export const TASK_FILE_EXTENSIONS = [
  ".ipynb", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf",
] as const;

export const SESSION_FILE_EXTENSIONS = [
  ".pptx", ".pdf", ".ipynb", ".py", ".png", ".jpg", ".jpeg", ".webp",
] as const;

/** Session materials may be up to 100 MB. */
export const MAX_SESSION_FILE_BYTES = 100 * 1024 * 1024;

export const MATERIAL_EXTENSIONS = [
  ".pdf", ".pptx", ".docx", ".xlsx", ".zip", ".png", ".jpg", ".jpeg",
  ".ipynb", ".py", ".csv", ".txt",
] as const;

/** Materials bucket limit (25 MB). */
export const MAX_MATERIAL_BYTES = 25 * 1024 * 1024;

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
}

export function isAllowedFile(
  name: string,
  extensions: readonly string[],
): boolean {
  return extensions.includes(fileExtension(name));
}

export function mimeForExtension(extension: string): string {
  const types: Record<string, string> = {
    ".py": "text/x-python",
    ".ipynb": "application/x-ipynb+json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".zip": "application/zip",
    ".csv": "text/csv",
    ".txt": "text/plain",
  };
  return types[extension] ?? "application/octet-stream";
}

export function isTextFile(extension: string): boolean {
  return extension === ".py" || extension === ".ipynb";
}

export const textSubmissionSchema = z.object({
  code: z.string().trim().min(1).max(MAX_SUBMISSION_CHARS),
});

export const assignmentSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(4000).optional().default(""),
  rubric: z.string().trim().max(4000),
  expected_output: z.string().trim().max(2000).optional().default(""),
  max_score: z.coerce.number().min(1).max(1000),
  allow_resubmit: z.boolean(),
  allowed_submission_types: z.enum(["file", "text", "both"]).default("both"),
});

/**
 * `datetime-local` values have no timezone. We treat them as UTC so the value
 * means the same thing on the server as in the form (the label says "UTC").
 */
export function parseDeadlineInput(
  value: string,
): { ok: true; iso: string | null } | { ok: false } {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, iso: null };
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) return { ok: false };

  const withSeconds = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  const date = new Date(`${withSeconds}Z`);
  if (Number.isNaN(date.getTime())) return { ok: false };
  return { ok: true, iso: date.toISOString() };
}

const scoreInputSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() !== "" ? Number(value) : value,
  z.number().min(0).max(1000),
);

export const submissionReviewSchema = z.object({
  submission_id: idSchema,
  final_score: scoreInputSchema,
  status: z.enum(["graded", "flagged"]),
});

export const gradingRequestSchema = z.object({
  submission_id: idSchema,
  force: z.boolean(),
});

/* -------------------------------------------------------------------------- */
/* Phase 4: points configuration                                              */
/* -------------------------------------------------------------------------- */

const pointsNumber = (min: number, max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : value,
    z.number().min(min).max(max),
  );

export const pointsConfigSchema = z.object({
  homework_weight: pointsNumber(0, 10),
  attendance_points: pointsNumber(0, 1000),
  on_time_bonus: pointsNumber(0, 1000),
  streak_bonus: pointsNumber(0, 1000),
  leaderboard_visible: z.boolean(),
});

/* -------------------------------------------------------------------------- */
/* Phase 5: announcements + similarity                                        */
/* -------------------------------------------------------------------------- */

export const announcementSchema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().max(5000),
  pinned: z.boolean(),
});

export const similarityCheckSchema = z.object({
  assignment_id: idSchema,
  threshold: z.coerce.number().min(30).max(100),
});

/** Translate a Zod field error into a message key suffix. */
export function fieldFromZodError(error: z.ZodError): string {
  const path = error.issues[0]?.path?.[0];
  return typeof path === "string" ? path : "generic";
}
