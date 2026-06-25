import { supabase } from "@/integrations/supabase/client";

export type PrivacySettings = {
  is_private: boolean;
  hide_online_status: boolean;
  disable_dms: boolean;
  restrict_mentions: "everyone" | "followers" | "nobody";
  restrict_comments: "everyone" | "followers" | "nobody";
};

const DEFAULTS: PrivacySettings = {
  is_private: false,
  hide_online_status: false,
  disable_dms: false,
  restrict_mentions: "everyone",
  restrict_comments: "everyone",
};

export async function fetchPrivacySettings(): Promise<PrivacySettings> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return DEFAULTS;
  const { data } = await supabase
    .from("user_privacy_settings")
    .select("*")
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (!data) return DEFAULTS;
  return {
    is_private: data.is_private ?? false,
    hide_online_status: data.hide_online_status ?? false,
    disable_dms: data.disable_dms ?? false,
    restrict_mentions: (data.restrict_mentions as PrivacySettings["restrict_mentions"]) ?? "everyone",
    restrict_comments: (data.restrict_comments as PrivacySettings["restrict_comments"]) ?? "everyone",
  };
}

export async function savePrivacySettings(settings: PrivacySettings): Promise<void> {
  const { error } = await supabase.rpc("upsert_privacy_settings", {
    _is_private: settings.is_private,
    _hide_online_status: settings.hide_online_status,
    _disable_dms: settings.disable_dms,
    _restrict_mentions: settings.restrict_mentions,
    _restrict_comments: settings.restrict_comments,
  });
  if (error) throw error;
}

export async function fetchUserPrivacy(userId: string): Promise<PrivacySettings> {
  const { data } = await supabase
    .from("user_privacy_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return DEFAULTS;
  return {
    is_private: data.is_private ?? false,
    hide_online_status: data.hide_online_status ?? false,
    disable_dms: data.disable_dms ?? false,
    restrict_mentions: (data.restrict_mentions as PrivacySettings["restrict_mentions"]) ?? "everyone",
    restrict_comments: (data.restrict_comments as PrivacySettings["restrict_comments"]) ?? "everyone",
  };
}
