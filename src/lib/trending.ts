import { supabase } from "@/integrations/supabase/client";
import { hydrateHowls, type HowlRecord } from "./howls";
import type { ProfileSummary } from "./profiles";
import type { HashtagSummary } from "./search";

const TRENDING_WINDOW_HOURS = 48;

function scoreRow(r: any): number {
  const age = (Date.now() - new Date(r.created_at).getTime()) / 36e5; // hours
  const recency = Math.max(0, 1 - age / TRENDING_WINDOW_HOURS);
  return (
    r.howl_count * 3 +
    r.echo_count * 2 +
    r.rehowl_count * 2 +
    r.view_count * 0.05 +
    recency * 6
  );
}

export async function fetchTrendingHowls(limit = 10): Promise<HowlRecord[]> {
  const since = new Date(Date.now() - TRENDING_WINDOW_HOURS * 36e5).toISOString();
  const { data } = await supabase
    .from("howls")
    .select(
      `id, author_id, content, view_count, howl_count, echo_count, rehowl_count, edited, created_at, updated_at,
       media:howl_media ( id, storage_path, media_type, position )`,
    )
    .gte("created_at", since)
    .order("howl_count", { ascending: false })
    .limit(80);
  const scored = (data ?? [])
    .map((r) => ({ r, s: scoreRow(r) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.r);
  return hydrateHowls(scored);
}

export async function fetchTrendingVideos(limit = 10): Promise<HowlRecord[]> {
  const since = new Date(Date.now() - TRENDING_WINDOW_HOURS * 36e5).toISOString();
  const { data: media } = await supabase
    .from("howl_media")
    .select(
      `howl_id, howls!inner ( id, author_id, content, view_count, howl_count, echo_count, rehowl_count, edited, created_at, updated_at )`,
    )
    .eq("media_type", "video")
    .gte("howls.created_at", since)
    .limit(80);
  const map = new Map<string, any>();
  for (const m of media ?? []) {
    if (m.howls && !map.has(m.howl_id)) map.set(m.howl_id, m.howls);
  }
  // Fetch media list per howl for hydration
  const ids = [...map.keys()];
  if (!ids.length) return [];
  const { data: rows } = await supabase
    .from("howls")
    .select(
      `id, author_id, content, view_count, howl_count, echo_count, rehowl_count, edited, created_at, updated_at,
       media:howl_media ( id, storage_path, media_type, position )`,
    )
    .in("id", ids);
  const scored = (rows ?? [])
    .map((r) => ({ r, s: scoreRow(r) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.r);
  return hydrateHowls(scored);
}

export async function fetchTrendingHashtags(limit = 10): Promise<HashtagSummary[]> {
  const since = new Date(Date.now() - 7 * 24 * 36e5).toISOString();
  const { data } = await supabase
    .from("hashtags")
    .select("tag, howl_count, last_used_at")
    .gte("last_used_at", since)
    .order("howl_count", { ascending: false })
    .limit(limit);
  return (data as HashtagSummary[]) ?? [];
}

export async function fetchTrendingUsers(limit = 10): Promise<ProfileSummary[]> {
  // Top followers gained in last 7 days
  const since = new Date(Date.now() - 7 * 24 * 36e5).toISOString();
  const { data } = await supabase
    .from("follows")
    .select("following_id, created_at")
    .gte("created_at", since)
    .limit(500);
  const counts = new Map<string, number>();
  for (const r of data ?? []) counts.set(r.following_id, (counts.get(r.following_id) ?? 0) + 1);
  const ids = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map((e) => e[0]);
  if (!ids.length) return [];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, followers_count, following_count, is_verified")
    .in("id", ids);
  const order = new Map(ids.map((id, i) => [id, i]));
  return ((profs as ProfileSummary[]) ?? [])
    .slice()
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export async function fetchTrendingSidebar(limit = 10): Promise<HashtagSummary[]> {
  return fetchTrendingHashtags(limit);
}