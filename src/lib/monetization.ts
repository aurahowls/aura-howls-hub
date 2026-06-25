import { supabase } from "@/integrations/supabase/client";

export type AccountType = "user" | "creator" | "business";

export interface CreatorPlan {
  creator_id: string;
  price_usd_cents: number;
  description: string | null;
  is_active: boolean;
}

export interface TipRecord {
  id: string;
  tipper_id: string;
  recipient_id: string;
  howl_id: string | null;
  amount_usd_cents: number;
  message: string | null;
  created_at: string;
}

export interface PromotedHowl {
  id: string;
  howl_id: string;
  user_id: string;
  budget_usd_cents: number;
  impressions: number;
  clicks: number;
  status: "pending" | "active" | "paused" | "expired" | "rejected";
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface CreatorDashboard {
  subscriber_count: number;
  total_tips_cents: number;
  tips_count: number;
  tips_30d_cents: number;
  howls_count: number;
  total_views: number;
  total_likes: number;
  total_echoes: number;
  promotions_active: number;
  promotions_impressions: number;
  promotions_clicks: number;
  wolf_plus_active: boolean;
}

export interface PlatformStats {
  total_users: number;
  new_users_7d: number;
  new_users_30d: number;
  total_howls: number;
  new_howls_7d: number;
  wolf_plus_count: number;
  creator_count: number;
  business_count: number;
  total_tips_cents: number;
  total_subscribers: number;
  active_promotions: number;
  invite_codes_active: number;
}

export function formatMoney(cents: number): string {
  return "$" + (cents / 100).toFixed(2);
}

// Wolf+ subscription
export async function getWolfPlusStatus(): Promise<{ active: boolean; tier: string; expires_at: string | null }> {
  const { data } = await supabase
    .from("wolf_plus_subscriptions")
    .select("status, tier, expires_at")
    .maybeSingle();
  if (!data || data.status !== "active") return { active: false, tier: "none", expires_at: null };
  return { active: true, tier: data.tier, expires_at: data.expires_at };
}

// Creator plan
export async function fetchCreatorPlan(creatorId: string): Promise<CreatorPlan | null> {
  const { data } = await supabase
    .from("creator_plans")
    .select("*")
    .eq("creator_id", creatorId)
    .maybeSingle();
  return data;
}

export async function saveCreatorPlan(price_usd_cents: number, description: string, is_active: boolean) {
  const { error } = await supabase.rpc("upsert_creator_plan", {
    _price_usd_cents: price_usd_cents,
    _description: description,
    _is_active: is_active,
  });
  if (error) throw error;
}

// Creator subscriptions
export async function checkIsSubscribed(creatorId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("creator_subscriptions")
    .select("id")
    .eq("subscriber_id", user.id)
    .eq("creator_id", creatorId)
    .eq("status", "active")
    .maybeSingle();
  return !!data;
}

export async function subscribeToCreator(creatorId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("creator_subscriptions")
    .upsert({ subscriber_id: user.id, creator_id: creatorId, status: "active" }, { onConflict: "subscriber_id,creator_id" });
  if (error) throw error;
}

export async function unsubscribeFromCreator(creatorId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("creator_subscriptions")
    .update({ status: "cancelled" })
    .eq("subscriber_id", user.id)
    .eq("creator_id", creatorId);
  if (error) throw error;
}

// Tips
export async function sendTip(recipientId: string, amountCents: number, howlId?: string, message?: string) {
  const { data, error } = await supabase.rpc("send_tip", {
    _recipient_id: recipientId,
    _amount_usd_cents: amountCents,
    _howl_id: howlId ?? null,
    _message: message ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function fetchTipsLeaderboard(limit = 20): Promise<{ recipient_id: string; total_cents: number; tip_count: number }[]> {
  const { data } = await supabase
    .from("tips_leaderboard")
    .select("recipient_id, total_cents, tip_count")
    .limit(limit);
  return (data ?? []) as any;
}

export async function fetchMyTipsReceived(limit = 50): Promise<TipRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("tips")
    .select("*")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as TipRecord[];
}

export async function fetchMyTipsSent(limit = 50): Promise<TipRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("tips")
    .select("*")
    .eq("tipper_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as TipRecord[];
}

// Promoted howls
export async function promoteHowl(howlId: string, budgetCents: number, days = 7): Promise<string> {
  const { data, error } = await supabase.rpc("promote_howl", {
    _howl_id: howlId,
    _budget_usd_cents: budgetCents,
    _days: days,
  });
  if (error) throw error;
  return data as string;
}

export async function fetchMyPromotions(): Promise<PromotedHowl[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("promoted_howls")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (data ?? []) as PromotedHowl[];
}

// Account settings
export async function updateAccountSettings(opts: {
  account_type?: AccountType;
  business_website?: string;
  business_email?: string;
  business_phone?: string;
}) {
  const { error } = await supabase.rpc("update_account_settings", {
    _account_type: opts.account_type ?? null,
    _business_website: opts.business_website ?? null,
    _business_email: opts.business_email ?? null,
    _business_phone: opts.business_phone ?? null,
  });
  if (error) throw error;
}

// Creator dashboard
export async function fetchCreatorDashboard(): Promise<CreatorDashboard> {
  const { data, error } = await supabase.rpc("get_creator_dashboard");
  if (error) throw error;
  return data as CreatorDashboard;
}

// Platform stats (admin)
export async function fetchPlatformStats(): Promise<PlatformStats> {
  const { data, error } = await supabase.rpc("get_platform_stats");
  if (error) throw error;
  return data as PlatformStats;
}
