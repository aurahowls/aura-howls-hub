import { supabase } from "@/integrations/supabase/client";
import { fetchHowlsByIds, type HowlRecord } from "./howls";

export async function fetchBookmarkIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from("bookmarks").select("howl_id").eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.howl_id));
}

export async function toggleBookmark(howlId: string, bookmarked: boolean) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in to save");
  if (bookmarked) {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .match({ user_id: u.user.id, howl_id: howlId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("bookmarks")
      .insert({ user_id: u.user.id, howl_id: howlId });
    if (error) throw error;
  }
}

export async function fetchBookmarkedHowls(userId: string): Promise<HowlRecord[]> {
  const { data } = await supabase
    .from("bookmarks")
    .select("howl_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  const ids = (data ?? []).map((r) => r.howl_id);
  return fetchHowlsByIds(ids);
}