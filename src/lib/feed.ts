import { supabase } from "@/integrations/supabase/client";
import { hydrateHowls, type HowlRecord } from "./howls";
import { fetchFollowingIds } from "./profiles";

const HOWL_SELECT = `id, author_id, content, view_count, howl_count, echo_count, rehowl_count, edited, created_at, updated_at,
  media:howl_media ( id, storage_path, media_type, position )`;

export type FeedPage = { items: HowlRecord[]; hasMore: boolean; cursor?: string };

// --- Following Pack feed: strict chronological from followed wolves (+ self) ---
export async function fetchFollowingFeedPage(beforeIso?: string, limit = 15): Promise<FeedPage> {
  const { data: u } = await supabase.auth.getUser();
  const me = u.user?.id;
  if (!me) return { items: [], hasMore: false };
  const followed = await fetchFollowingIds(me);
  const ids = Array.from(new Set([me, ...followed]));
  let q = supabase
    .from("howls")
    .select(HOWL_SELECT)
    .in("author_id", ids)
    .order("created_at", { ascending: false })
    .limit(limit + 1);
  if (beforeIso) q = q.lt("created_at", beforeIso);
  const { data, error } = await q;
  if (error) throw error;
  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const items = await hydrateHowls(slice);
  return { items, hasMore, cursor: items[items.length - 1]?.created_at };
}

// --- For You feed: scored pool of recent Howls (followed boost, engagement, recency) ---
type Pool = { items: HowlRecord[]; loadedAt: number; userId: string | null };
let pool: Pool | null = null;
const POOL_TTL_MS = 60_000;

export function invalidateForYouPool() {
  pool = null;
}

async function rebuildPool(): Promise<Pool> {
  const { data: u } = await supabase.auth.getUser();
  const me = u.user?.id ?? null;
  const followedSet = me ? new Set(await fetchFollowingIds(me)) : new Set<string>();
  const { data, error } = await supabase
    .from("howls")
    .select(HOWL_SELECT)
    .order("created_at", { ascending: false })
    .limit(150);
  if (error) throw error;
  const now = Date.now();
  const ranked = (data ?? [])
    .map((d: any) => {
      const ageH = (now - new Date(d.created_at).getTime()) / 3_600_000;
      const engagement = d.howl_count * 3 + d.rehowl_count * 2 + d.echo_count * 2 + d.view_count * 0.05;
      const followBoost = followedSet.has(d.author_id) ? 25 : 0;
      const recency = Math.max(0, 24 - ageH) * 0.8;
      const score = engagement + followBoost + recency - ageH * 0.15;
      return { d, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((s) => s.d);
  const items = await hydrateHowls(ranked);
  return { items, loadedAt: now, userId: me };
}

export async function fetchForYouFeedPage(page: number, limit = 15): Promise<FeedPage> {
  if (!pool || Date.now() - pool.loadedAt > POOL_TTL_MS) {
    pool = await rebuildPool();
  }
  const start = page * limit;
  const end = start + limit;
  return { items: pool.items.slice(start, end), hasMore: end < pool.items.length };
}