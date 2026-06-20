import { supabase } from "@/integrations/supabase/client";

const SIGNED_TTL = 60 * 60 * 24 * 7; // 7 days

export type Participant = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type ConversationRow = {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string;
  last_message_preview: string | null;
  created_at: string;
  partner: Participant | null;
  unread: number;
  last_read_at: string | null;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  media_path: string | null;
  media_type: "image" | "video" | null;
  media_url: string | null;
  created_at: string;
};

async function signMedia(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("dm-media").createSignedUrl(path, SIGNED_TTL);
  return data?.signedUrl ?? null;
}

export async function fetchConversations(meId: string): Promise<ConversationRow[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Omit<ConversationRow, "partner" | "unread" | "last_read_at">[];
  const partnerIds = rows.map((r) => (r.user_a === meId ? r.user_b : r.user_a));
  const { data: profiles } = partnerIds.length
    ? await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", partnerIds)
    : { data: [] as Participant[] };
  const pmap = new Map((profiles ?? []).map((p) => [p.id, p as Participant]));

  const { data: reads } = await supabase
    .from("message_reads")
    .select("conversation_id, last_read_at")
    .eq("user_id", meId);
  const rmap = new Map((reads ?? []).map((r) => [r.conversation_id, r.last_read_at as string]));

  const result: ConversationRow[] = [];
  for (const r of rows) {
    const partnerId = r.user_a === meId ? r.user_b : r.user_a;
    const lastRead = rmap.get(r.id) ?? null;
    let unread = 0;
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", r.id)
      .neq("sender_id", meId)
      .gt("created_at", lastRead ?? "1970-01-01");
    unread = count ?? 0;
    result.push({ ...r, partner: pmap.get(partnerId) ?? null, unread, last_read_at: lastRead });
  }
  return result;
}

export async function fetchMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return Promise.all(
    (data ?? []).map(async (m) => ({
      ...(m as MessageRow),
      media_url: await signMedia((m as MessageRow).media_path),
    })),
  );
}

export async function hydrateMessage(m: MessageRow): Promise<MessageRow> {
  return { ...m, media_url: await signMedia(m.media_path) };
}

export async function getOrCreateConversation(meId: string, otherId: string): Promise<string> {
  if (meId === otherId) throw new Error("Cannot DM yourself");
  const [a, b] = meId < otherId ? [meId, otherId] : [otherId, meId];
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_a", a)
    .eq("user_b", b)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_a: a, user_b: b })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function sendMessage(input: {
  conversationId: string;
  senderId: string;
  content?: string | null;
  file?: File | null;
}) {
  let media_path: string | null = null;
  let media_type: "image" | "video" | null = null;
  if (input.file) {
    const type = input.file.type.startsWith("video") ? "video" : "image";
    media_type = type;
    const ext = input.file.name.split(".").pop() ?? (type === "image" ? "jpg" : "mp4");
    const path = `${input.conversationId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("dm-media")
      .upload(path, input.file, { contentType: input.file.type, upsert: false });
    if (upErr) throw upErr;
    media_path = path;
  }
  const { error } = await supabase.from("messages").insert({
    conversation_id: input.conversationId,
    sender_id: input.senderId,
    content: input.content?.trim() || null,
    media_path,
    media_type,
  });
  if (error) throw error;
}

export async function markConversationRead(conversationId: string, userId: string) {
  await supabase
    .from("message_reads")
    .upsert(
      { conversation_id: conversationId, user_id: userId, last_read_at: new Date().toISOString() },
      { onConflict: "conversation_id,user_id" },
    );
}