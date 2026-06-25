import { supabase } from "@/integrations/supabase/client";

export const REFERRAL_STORAGE_KEY = "aurahowls:pending_ref";
export const CREDITS_PER_REFERRAL = 30; // days of Wolf+
export const WELCOME_CREDITS = 7; // days for new user

export interface ReferralStats {
  code: string | null;
  total_referrals: number;
  rewarded_referrals: number;
  pending_referrals: number;
  total_credits: number;
  credits_as_days: number;
  referrals_this_month: number;
}

export interface ReferralEntry {
  id: string;
  status: "pending" | "confirmed" | "rewarded";
  created_at: string;
  rewarded_at: string | null;
  referred_username: string;
  referred_display_name: string | null;
  referred_avatar_url: string | null;
}

/** Persist a referral code from the URL before the user signs up */
export function storeReferralCode(code: string) {
  try { sessionStorage.setItem(REFERRAL_STORAGE_KEY, code.trim().toUpperCase()); } catch {}
}

/** Retrieve the pending referral code stored before signup */
export function consumeReferralCode(): string | null {
  try {
    const code = sessionStorage.getItem(REFERRAL_STORAGE_KEY);
    if (code) sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
    return code;
  } catch { return null; }
}

/** Get or lazily create the current user's unique referral code */
export async function getMyReferralCode(): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_or_create_referral_code");
  if (error) { console.error("get_or_create_referral_code:", error); return null; }
  return data as string;
}

/** Apply a referral code for the newly signed-up user */
export async function applyReferralCode(code: string): Promise<{ success: boolean; reason?: string; referrer_credits_awarded?: number; new_user_credits_awarded?: number }> {
  const { data, error } = await supabase.rpc("apply_referral_code", { _code: code });
  if (error) return { success: false, reason: error.message };
  return data as any;
}

/** Fetch referral stats for the current user */
export async function fetchReferralStats(): Promise<ReferralStats> {
  const { data, error } = await supabase.rpc("get_referral_stats");
  if (error) throw error;
  return data as ReferralStats;
}

/** Fetch the list of referred users */
export async function fetchMyReferrals(limit = 20): Promise<ReferralEntry[]> {
  const { data, error } = await supabase.rpc("get_my_referrals", { lim: limit });
  if (error) throw error;
  return (data as ReferralEntry[]) ?? [];
}

/** Build the shareable referral URL */
export function buildReferralUrl(code: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://aurahowlshub.com";
  return `${base}/auth?ref=${code}`;
}

/** Copy referral link to clipboard, return true on success */
export async function copyReferralLink(code: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildReferralUrl(code));
    return true;
  } catch { return false; }
}
