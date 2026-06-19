import { supabase } from "@/integrations/supabase/client";

export type HowlMediaItem = {
  id: string;
  url: string;
  storage_path: string;
  media_type: "image" | "video";
  position: number;
};

export type HowlAuthor = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type HowlRecord = {
  id: string;
  author_id: string;
  content: string | null;
  view_count: number;
  howl_count: number;
  echo_count: number;
  rehowl_count: number;
  edited: boolean;
  created_at: string;
  updated_at: string;
  author: HowlAuthor | null;
  media: HowlMediaItem[];
  liked: boolean;
  rehowled: boolean;
};

const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 year

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function detectMediaType(file: File): "image" | "video" | null {
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) return "image";
  if (ALLOWED_VIDEO_TYPES.includes(file.type)) return "video";
  // Fallback by extension for .mov on some platforms
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && ["mp4", "mov", "webm"].includes(ext)) return "video";
  if (ext && ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  return null;
}

async function signMediaUrls(
  items: { id: string; storage_path: string; media_type: string; position: number }[],
): Promise<HowlMediaItem[]> {
  if (items.length === 0) return [];
  const { data, error } = await supabase.storage
    .from("howl-media")
    .createSignedUrls(items.map((m) => m.storage_path), SIGNED_URL_TTL);
  if (error) throw error;
  return items
    .map((m, i) => ({
      id: m.id,
      storage_path: m.storage_path,
      media_type: m.media_type as "image" | "video",
      position: m.position,
      url: data?.[i]?.signedUrl ?? "",
    }))
    .sort((a, b) => a.position - b.position);
}

export async function fetchFeed(opts?: { authorId?: string }): Promise<HowlRecord[]> {
  let query = supabase
    .from("howls")
    .select(
      `id, author_id, content, view_count, howl_count, echo_count, rehowl_count, edited, created_at, updated_at,
       media:howl_media ( id, storage_path, media_type, position )`,
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (opts?.authorId) query = query.eq("author_id", opts.authorId);
  const { data, error } = await query;
  if (error) throw error;
  return hydrateHowls(data ?? []);
}

export async function fetchHowlsByIds(ids: string[]): Promise<HowlRecord[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("howls")
    .select(
      `id, author_id, content, view_count, howl_count, echo_count, rehowl_count, edited, created_at, updated_at,
       media:howl_media ( id, storage_path, media_type, position )`,
    )
    .in("id", ids);
  if (error) throw error;
  const order = new Map(ids.map((id, i) => [id, i]));
  const sorted = (data ?? []).slice().sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return hydrateHowls(sorted);
}

export async function fetchMediaHowls(authorId: string): Promise<HowlRecord[]> {
  const { data: media } = await supabase
    .from("howl_media")
    .select("howl_id, howls!inner(author_id, created_at)")
    .eq("howls.author_id", authorId)
    .order("created_at", { foreignTable: "howls", ascending: false })
    .limit(80);
  const ids = Array.from(new Set((media ?? []).map((m: any) => m.howl_id)));
  return fetchHowlsByIds(ids);
}

async function hydrateHowls(data: any[]): Promise<HowlRecord[]> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  const ids = (data ?? []).map((d) => d.id);
  const authorIds = Array.from(new Set((data ?? []).map((d) => d.author_id)));
  let likedSet = new Set<string>();
  let rehowledSet = new Set<string>();
  let authorMap = new Map<string, HowlAuthor>();
  if (authorIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", authorIds);
    for (const p of profs ?? []) authorMap.set(p.id, p as HowlAuthor);
  }
  if (userId && ids.length) {
    const [likes, rehowls] = await Promise.all([
      supabase.from("howl_likes").select("howl_id").eq("user_id", userId).in("howl_id", ids),
      supabase.from("howl_rehowls").select("howl_id").eq("user_id", userId).in("howl_id", ids),
    ]);
    likedSet = new Set((likes.data ?? []).map((r) => r.howl_id));
    rehowledSet = new Set((rehowls.data ?? []).map((r) => r.howl_id));
  }

  const rows = await Promise.all(
    (data ?? []).map(async (d) => {
      const media = await signMediaUrls((d.media as any) ?? []);
      const author = authorMap.get(d.author_id) ?? null;
      return {
        ...d,
        author,
        media,
        liked: likedSet.has(d.id),
        rehowled: rehowledSet.has(d.id),
      } as HowlRecord;
    }),
  );
  return rows;
}

export type UploadProgress = { fileIndex: number; loaded: number; total: number; percent: number };

export async function createHowl(params: {
  content: string;
  files: File[];
  onProgress?: (p: UploadProgress) => void;
}): Promise<HowlRecord> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error("Not signed in");
  const userId = userData.user.id;

  // Validate files
  const types: ("image" | "video")[] = [];
  let hasVideo = false;
  for (const f of params.files) {
    const t = detectMediaType(f);
    if (!t) throw new Error(`Unsupported file type: ${f.name}`);
    if (t === "video") {
      if (f.size > MAX_VIDEO_BYTES) throw new Error(`Video ${f.name} exceeds 100 MB`);
      hasVideo = true;
    }
    types.push(t);
  }
  if (hasVideo && params.files.length > 1)
    throw new Error("A Howl can include either one video or multiple images, not both");

  const content = params.content.trim();
  if (!content && params.files.length === 0) throw new Error("Howl needs text or media");

  const { data: howl, error: insertErr } = await supabase
    .from("howls")
    .insert({ author_id: userId, content: content || null })
    .select("id, author_id, content, view_count, howl_count, echo_count, rehowl_count, edited, created_at, updated_at")
    .single();
  if (insertErr || !howl) throw insertErr ?? new Error("Failed to create Howl");

  const uploaded: { storage_path: string; media_type: "image" | "video"; position: number }[] = [];
  try {
    for (let i = 0; i < params.files.length; i++) {
      const file = params.files[i];
      const type = types[i];
      const ext = file.name.split(".").pop()?.toLowerCase() || (type === "video" ? "mp4" : "jpg");
      const path = `${userId}/${howl.id}/${i}-${crypto.randomUUID()}.${ext}`;

      // Use XHR for real upload progress events
      await uploadWithProgress({
        file,
        path,
        onProgress: (loaded, total) =>
          params.onProgress?.({
            fileIndex: i,
            loaded,
            total,
            percent: total > 0 ? Math.round((loaded / total) * 100) : 0,
          }),
      });
      uploaded.push({ storage_path: path, media_type: type, position: i });
    }

    if (uploaded.length) {
      const { error: mediaErr } = await supabase
        .from("howl_media")
        .insert(uploaded.map((u) => ({ howl_id: howl.id, url: "", ...u })));
      if (mediaErr) throw mediaErr;
    }
  } catch (e) {
    // Rollback howl + uploaded files on failure
    if (uploaded.length) await supabase.storage.from("howl-media").remove(uploaded.map((u) => u.storage_path));
    await supabase.from("howls").delete().eq("id", howl.id);
    throw e;
  }

  // Re-fetch with media + author
  const [feed] = await fetchFeed({ authorId: userId });
  return feed;
}

async function uploadWithProgress(opts: {
  file: File;
  path: string;
  onProgress: (loaded: number, total: number) => void;
}): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/howl-media/${opts.path}`;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "3600");
    if (opts.file.type) xhr.setRequestHeader("content-type", opts.file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress(e.loaded, e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.send(opts.file);
  });
}

export async function deleteHowl(howlId: string) {
  // Find media paths first so we can clean storage
  const { data: media } = await supabase.from("howl_media").select("storage_path").eq("howl_id", howlId);
  const { error } = await supabase.from("howls").delete().eq("id", howlId);
  if (error) throw error;
  if (media?.length) await supabase.storage.from("howl-media").remove(media.map((m) => m.storage_path));
}

export async function editHowl(howlId: string, content: string) {
  const { error } = await supabase
    .from("howls")
    .update({ content: content.trim() || null, edited: true })
    .eq("id", howlId);
  if (error) throw error;
}

export async function toggleLike(howlId: string, liked: boolean) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sign in to howl");
  if (liked) {
    const { error } = await supabase.from("howl_likes").delete().match({ howl_id: howlId, user_id: userId });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("howl_likes").insert({ howl_id: howlId, user_id: userId });
    if (error) throw error;
  }
}

export async function toggleRehowl(howlId: string, rehowled: boolean) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sign in to rehowl");
  if (rehowled) {
    const { error } = await supabase.from("howl_rehowls").delete().match({ howl_id: howlId, user_id: userId });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("howl_rehowls").insert({ howl_id: howlId, user_id: userId });
    if (error) throw error;
  }
}

export async function incrementView(howlId: string) {
  await supabase.rpc("increment_howl_view", { _howl: howlId });
}

export type EchoRecord = {
  id: string;
  howl_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: HowlAuthor | null;
};

export async function fetchEchoes(howlId: string): Promise<EchoRecord[]> {
  const { data, error } = await supabase
    .from("howl_echoes")
    .select(
      `id, howl_id, author_id, content, created_at`,
    )
    .eq("howl_id", howlId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const ids = Array.from(new Set((data ?? []).map((d) => d.author_id)));
  const map = new Map<string, HowlAuthor>();
  if (ids.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", ids);
    for (const p of profs ?? []) map.set(p.id, p as HowlAuthor);
  }
  return (data ?? []).map((d) => ({ ...d, author: map.get(d.author_id) ?? null }));
}

export async function createEcho(howlId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Echo cannot be empty");
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sign in to echo");
  const { error } = await supabase
    .from("howl_echoes")
    .insert({ howl_id: howlId, author_id: userId, content: trimmed });
  if (error) throw error;
}

export async function deleteEcho(echoId: string) {
  const { error } = await supabase.from("howl_echoes").delete().eq("id", echoId);
  if (error) throw error;
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}