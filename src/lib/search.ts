import { supabase } from "@/integrations/supabase/client";
import { fetchHowlsByIds, type HowlRecord } from "./howls";
import type { ProfileSummary } from "./profiles";

export type HashtagSummary = { tag: string; howl_count: number; last_used_at: string };

export async function searchUsers(q: string, opts?: { verifiedOnly?: boolean }): Promise<ProfileSummary[]> {
  const term = q.trim().replace(/^@/, "");
  if (!term) return [];
  let query = supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, followers_count, following_count, is_verified")
    .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
    .order("followers_count", { ascending: false })
    .limit(30);
  if (opts?.verifiedOnly) query = query.eq("is_verified", true);
  const { data } = await query;
  return (data as ProfileSummary[]) ?? [];
}

export async function searchHowls(q: string): Promise<HowlRecord[]> {
  const term = q.trim();
  if (!term) return [];
  const { data } = await supabase
    .from("howls")
    .select("id")
    .ilike("content", `%${term}%`)
    .order("created_at", { ascending: false })
    .limit(50);
  return fetchHowlsByIds((data ?? []).map((r) => r.id));
}

export async function searchVideos(q: string): Promise<HowlRecord[]> {
  const term = q.trim();
  const { data: media } = await supabase
    .from("howl_media")
    .select("howl_id, howls!inner(content, created_at)")
    .eq("media_type", "video")
    .order("created_at", { foreignTable: "howls", ascending: false })
    .limit(60);
  let ids = Array.from(new Set((media ?? []).map((m: any) => m.howl_id)));
  if (term) {
    const wanted = new Set(
      (media ?? [])
        .filter((m: any) => (m.howls?.content ?? "").toLowerCase().includes(term.toLowerCase()))
        .map((m: any) => m.howl_id),
    );
    if (wanted.size > 0) ids = ids.filter((id) => wanted.has(id));
  }
  return fetchHowlsByIds(ids);
}

export async function searchHashtags(q: string): Promise<HashtagSummary[]> {
  const term = q.trim().replace(/^#/, "").toLowerCase();
  let query = supabase
    .from("hashtags")
    .select("tag, howl_count, last_used_at")
    .order("howl_count", { ascending: false })
    .limit(30);
  if (term) query = query.ilike("tag", `%${term}%`);
  const { data } = await query;
  return (data as HashtagSummary[]) ?? [];
}

export type SuggestUsers = ProfileSummary[];
export async function suggestUsersForMention(prefix: string, limit = 5): Promise<SuggestUsers> {
  if (!prefix) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, followers_count, following_count, is_verified")
    .ilike("username", `${prefix}%`)
    .order("followers_count", { ascending: false })
    .limit(limit);
  return (data as ProfileSummary[]) ?? [];
}

export async function suggestHashtags(prefix: string, limit = 5): Promise<HashtagSummary[]> {
  if (!prefix) {
    const { data } = await supabase
      .from("hashtags")
      .select("tag, howl_count, last_used_at")
      .order("howl_count", { ascending: false })
      .limit(limit);
    return (data as HashtagSummary[]) ?? [];
  }
  const { data } = await supabase
    .from("hashtags")
    .select("tag, howl_count, last_used_at")
    .ilike("tag", `${prefix.toLowerCase()}%`)
    .order("howl_count", { ascending: false })
    .limit(limit);
  return (data as HashtagSummary[]) ?? [];
}

export async function recordRecentSearch(query: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const q = query.trim().slice(0, 80);
  if (!q) return;
  await supabase
    .from("recent_searches")
    .upsert({ user_id: u.user.id, query: q }, { onConflict: "user_id,query" });
}

export async function fetchRecentSearches(): Promise<string[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data } = await supabase
    .from("recent_searches")
    .select("query, created_at")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false })
    .limit(10);
  return (data ?? []).map((r) => r.query);
}

export async function clearRecentSearches() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from("recent_searches").delete().eq("user_id", u.user.id);
}

export async function fetchHowlsByHashtag(tag: string): Promise<HowlRecord[]> {
  const { data } = await supabase
    .from("howl_hashtags")
    .select("howl_id, created_at")
    .eq("tag", tag.toLowerCase())
    .order("created_at", { ascending: false })
    .limit(60);
  return fetchHowlsByIds((data ?? []).map((r) => r.howl_id));
}