import { supabase } from "@/integrations/supabase/client";

export type VerificationRequest = {
  id: string;
  user_id: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export async function isAdmin(): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", u.user.id)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export async function fetchMyRequest(): Promise<VerificationRequest | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase
    .from("verification_requests")
    .select("*")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as VerificationRequest) ?? null;
}

export async function submitRequest(reason: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in required");
  const { error } = await supabase
    .from("verification_requests")
    .insert({ user_id: u.user.id, reason: reason.trim() });
  if (error) throw error;
}

export async function fetchAllRequests(): Promise<
  (VerificationRequest & { username: string | null; display_name: string | null; avatar_url: string | null })[]
> {
  const { data } = await supabase
    .from("verification_requests")
    .select("*")
    .order("created_at", { ascending: false });
  const rows = (data as VerificationRequest[]) ?? [];
  const ids = [...new Set(rows.map((r) => r.user_id))];
  if (!ids.length) return [];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids);
  const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
  return rows.map((r) => ({ ...r, ...(map.get(r.user_id) ?? { username: null, display_name: null, avatar_url: null }) }));
}

export async function reviewRequest(id: string, status: "approved" | "rejected") {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in required");
  const { error } = await supabase
    .from("verification_requests")
    .update({ status, reviewed_by: u.user.id, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}