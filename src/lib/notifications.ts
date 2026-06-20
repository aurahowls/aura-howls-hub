import { supabase } from "@/integrations/supabase/client";

export type NotificationType = "follow" | "howl_like" | "echo" | "rehowl" | "mention" | "dm";

export type AlertActor = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type AlertRecord = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  howl_id: string | null;
  echo_id: string | null;
  conversation_id: string | null;
  message_id: string | null;
  preview: string | null;
  read: boolean;
  created_at: string;
  actor: AlertActor | null;
};

export async function fetchAlerts(): Promise<AlertRecord[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const rows = (data ?? []) as AlertRecord[];
  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean))) as string[];
  if (actorIds.length === 0) return rows.map((r) => ({ ...r, actor: null }));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", actorIds);
  const map = new Map((profiles ?? []).map((p) => [p.id, p as AlertActor]));
  return rows.map((r) => ({ ...r, actor: r.actor_id ? map.get(r.actor_id) ?? null : null }));
}

export async function unreadAlertCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  return count ?? 0;
}

export async function markAllAlertsRead(userId: string) {
  await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
}

export async function markAlertRead(id: string) {
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}