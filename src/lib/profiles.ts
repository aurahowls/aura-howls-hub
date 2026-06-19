import { supabase } from "@/integrations/supabase/client";
import type { HowlRecord } from "./howls";

export type ProfileSummary = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
};

const AVATAR_TTL = 60 * 60 * 24 * 365;

async function signOne(bucket: "avatars" | "banners", path: string | null): Promise<string | null> {
  if (!path) return null;
  // If already a full URL (legacy), return as-is.
  if (/^https?:\/\//i.test(path)) return path;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, AVATAR_TTL);
  if (error) return null;
  return data.signedUrl;
}

export async function resolveAvatar(path: string | null) {
  return signOne("avatars", path);
}
export async function resolveBanner(path: string | null) {
  return signOne("banners", path);
}

export async function uploadAvatar(file: File): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in required");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${u.user.id}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
    cacheControl: "3600",
  });
  if (error) throw error;
  await supabase.from("profiles").update({ avatar_url: path }).eq("id", u.user.id);
  return path;
}

export async function uploadBanner(file: File): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in required");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${u.user.id}/banner-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("banners").upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
    cacheControl: "3600",
  });
  if (error) throw error;
  await supabase.from("profiles").update({ banner_url: path }).eq("id", u.user.id);
  return path;
}

export async function isFollowing(targetId: string): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user || u.user.id === targetId) return false;
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", u.user.id)
    .eq("following_id", targetId)
    .maybeSingle();
  return !!data;
}

export async function toggleFollow(targetId: string, following: boolean) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in to follow");
  if (u.user.id === targetId) throw new Error("Cannot follow yourself");
  if (following) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .match({ follower_id: u.user.id, following_id: targetId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: u.user.id, following_id: targetId });
    if (error) throw error;
  }
}

export async function fetchSuggestedPack(limit = 5): Promise<ProfileSummary[]> {
  const { data: u } = await supabase.auth.getUser();
  const me = u.user?.id;
  // Wolves I already follow
  let exclude: string[] = me ? [me] : [];
  if (me) {
    const { data: f } = await supabase.from("follows").select("following_id").eq("follower_id", me);
    exclude = exclude.concat((f ?? []).map((r) => r.following_id));
  }
  let q = supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, followers_count, following_count")
    .order("followers_count", { ascending: false })
    .limit(limit);
  if (exclude.length) q = q.not("id", "in", `(${exclude.join(",")})`);
  const { data } = await q;
  return (data as ProfileSummary[]) ?? [];
}

export async function fetchLikedHowls(userId: string): Promise<HowlRecord[]> {
  const { data: likes } = await supabase
    .from("howl_likes")
    .select("howl_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  const ids = (likes ?? []).map((r) => r.howl_id);
  if (ids.length === 0) return [];
  const { fetchHowlsByIds } = await import("./howls");
  return fetchHowlsByIds(ids);
}