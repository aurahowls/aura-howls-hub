import { supabase } from "@/integrations/supabase/client";
import { checkRateLimit } from "@/lib/moderation";

// ─── File validation ────────────────────────────────────────────────────────

export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const ALLOWED_IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "gif"];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
export const ALLOWED_VIDEO_EXTS = ["mp4", "mov", "webm"];
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

export const MAX_IMAGES_PER_HOWL = 4;

export type FileValidationError =
  | "unsupported_type"
  | "too_large"
  | "too_many"
  | "mixed_types";

export function validateImageFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const typeOk = ALLOWED_IMAGE_TYPES.includes(file.type) || ALLOWED_IMAGE_EXTS.includes(ext);
  if (!typeOk) return `"${file.name}" is not a supported image (PNG, JPG, WebP, GIF).`;
  if (file.size > MAX_IMAGE_BYTES) return `"${file.name}" exceeds the 10 MB image limit.`;
  return null;
}

export function validateVideoFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const typeOk = ALLOWED_VIDEO_TYPES.includes(file.type) || ALLOWED_VIDEO_EXTS.includes(ext);
  if (!typeOk) return `"${file.name}" is not a supported video (MP4, MOV, WebM).`;
  if (file.size > MAX_VIDEO_BYTES) return `"${file.name}" exceeds the 100 MB video limit.`;
  return null;
}

export function validateHowlFiles(files: File[]): string | null {
  if (files.length === 0) return null;
  const images = files.filter((f) => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    return ALLOWED_IMAGE_TYPES.includes(f.type) || ALLOWED_IMAGE_EXTS.includes(ext);
  });
  const videos = files.filter((f) => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    return ALLOWED_VIDEO_TYPES.includes(f.type) || ALLOWED_VIDEO_EXTS.includes(ext);
  });
  const other = files.filter((f) => !images.includes(f) && !videos.includes(f));
  if (other.length > 0) return `Unsupported file: "${other[0].name}"`;
  if (videos.length > 0 && images.length > 0)
    return "A Howl can have either one video or up to 4 images — not both.";
  if (videos.length > 1) return "A Howl can contain only one video.";
  if (images.length > MAX_IMAGES_PER_HOWL)
    return `A Howl can have at most ${MAX_IMAGES_PER_HOWL} images.`;
  for (const f of images) {
    const err = validateImageFile(f);
    if (err) return err;
  }
  for (const f of videos) {
    const err = validateVideoFile(f);
    if (err) return err;
  }
  return null;
}

// ─── Text sanitization ───────────────────────────────────────────────────────

const HTML_TAG_RE = /<[^>]*>/g;
const SCRIPT_RE = /javascript\s*:/gi;

export function sanitizeText(raw: string): string {
  return raw.replace(HTML_TAG_RE, "").replace(SCRIPT_RE, "").trim();
}

export function sanitizeHowlContent(content: string): string {
  // Strip HTML, normalize whitespace, enforce length
  return sanitizeText(content).replace(/\s{3,}/g, "\n\n").slice(0, 500);
}

// ─── Rate limiting ───────────────────────────────────────────────────────────

export async function checkHowlRateLimit(): Promise<boolean> {
  return checkRateLimit("howl", 5, 300); // 5 howls per 5 min
}

export async function checkEchoRateLimit(): Promise<boolean> {
  return checkRateLimit("echo", 15, 300); // 15 echoes per 5 min
}

export async function checkDmRateLimit(): Promise<boolean> {
  return checkRateLimit("dm", 30, 300); // 30 DMs per 5 min
}

// ─── Duplicate detection ─────────────────────────────────────────────────────

export async function checkDuplicateHowl(content: string): Promise<boolean> {
  if (!content.trim()) return false;
  const { data, error } = await supabase.rpc("check_duplicate_howl", { _content: content.trim() });
  if (error) return false;
  return !!data;
}

// ─── Security event logging ──────────────────────────────────────────────────

export type SecurityEventType =
  | "login"
  | "logout"
  | "password_change"
  | "password_reset"
  | "email_change"
  | "session_revoked_all";

function parseDeviceHint(ua: string): string {
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac OS/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown";
}

export async function recordSecurityEvent(
  eventType: SecurityEventType,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const ua = navigator.userAgent;
    const deviceHint = parseDeviceHint(ua);
    await supabase.rpc("log_security_event", {
      _event_type: eventType,
      _user_agent: ua.slice(0, 500),
      _device_hint: deviceHint,
      _metadata: metadata ?? null,
    });
  } catch {
    // Non-blocking
  }
}

export async function fetchSecurityEvents(limit = 50) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data } = await supabase
    .from("security_events")
    .select("*")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as {
    id: string;
    event_type: string;
    user_agent: string | null;
    device_hint: string | null;
    created_at: string;
    metadata: Record<string, unknown> | null;
  }[];
}

// ─── Password strength ───────────────────────────────────────────────────────

export type PasswordStrength = "weak" | "fair" | "strong" | "very_strong";

export function checkPasswordStrength(password: string): { strength: PasswordStrength; score: number; hints: string[] } {
  let score = 0;
  const hints: string[] = [];
  if (password.length >= 8) score++;
  else hints.push("Use at least 8 characters");
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  else hints.push("Add an uppercase letter");
  if (/[a-z]/.test(password)) score++;
  else hints.push("Add a lowercase letter");
  if (/[0-9]/.test(password)) score++;
  else hints.push("Add a number");
  if (/[^A-Za-z0-9]/.test(password)) score++;
  else hints.push("Add a special character (!@#$%)");

  let strength: PasswordStrength = "weak";
  if (score >= 5) strength = "very_strong";
  else if (score >= 4) strength = "strong";
  else if (score >= 2) strength = "fair";
  return { strength, score, hints };
}
