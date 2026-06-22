import { supabase } from "@/integrations/supabase/client";

// ---------- Roles ----------
export type ModRole = { isAdmin: boolean; isModerator: boolean };

export async function fetchModRole(): Promise<ModRole> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { isAdmin: false, isModerator: false };
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", u.user.id);
  const roles = new Set((data ?? []).map((r: any) => r.role));
  return { isAdmin: roles.has("admin"), isModerator: roles.has("admin") || roles.has("moderator") };
}

// ---------- Rate limit ----------
export async function checkRateLimit(action: string, max: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    _action: action,
    _max: max,
    _window_seconds: windowSeconds,
  });
  if (error) return true; // fail open
  return !!data;
}

// ---------- Reports ----------
export type ReportTarget = "user" | "howl" | "echo" | "message";

export async function submitReport(input: {
  target_type: ReportTarget;
  target_id: string;
  reason: string;
  details?: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in required");
  const ok = await checkRateLimit("report", 10, 3600);
  if (!ok) throw new Error("Too many reports — slow down");
  const { error } = await supabase.from("reports").insert({
    reporter_id: u.user.id,
    target_type: input.target_type,
    target_id: input.target_id,
    reason: input.reason.trim().slice(0, 100),
    details: input.details?.trim().slice(0, 2000) || null,
  });
  if (error) throw error;
}

export async function fetchReports(status?: "pending" | "reviewing" | "resolved" | "dismissed") {
  let q = supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(200);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  const reporters = Array.from(new Set((data ?? []).map((r: any) => r.reporter_id)));
  const profMap = new Map<string, any>();
  if (reporters.length) {
    const { data: p } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", reporters);
    for (const row of p ?? []) profMap.set(row.id, row);
  }
  return (data ?? []).map((r: any) => ({ ...r, reporter: profMap.get(r.reporter_id) ?? null }));
}

export async function updateReport(
  id: string,
  patch: { status?: "pending" | "reviewing" | "resolved" | "dismissed"; resolution_notes?: string },
) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("reports")
    .update({ ...patch, reviewed_by: u.user?.id ?? null, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await logModAction("update_report", "report", id, patch.status ?? "updated");
}

// ---------- Blocks & Mutes ----------
export async function blockUser(targetId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in required");
  if (u.user.id === targetId) throw new Error("Can't block yourself");
  // Also remove follow relationships both ways
  await supabase.from("follows").delete().or(
    `and(follower_id.eq.${u.user.id},following_id.eq.${targetId}),and(follower_id.eq.${targetId},following_id.eq.${u.user.id})`,
  );
  const { error } = await supabase.from("blocks").insert({ blocker_id: u.user.id, blocked_id: targetId });
  if (error && !/duplicate/i.test(error.message)) throw error;
}

export async function unblockUser(targetId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in required");
  const { error } = await supabase
    .from("blocks")
    .delete()
    .match({ blocker_id: u.user.id, blocked_id: targetId });
  if (error) throw error;
}

export async function fetchMyBlockIds(): Promise<string[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", u.user.id);
  return (data ?? []).map((r: any) => r.blocked_id);
}

export async function fetchMyBlocks() {
  const ids = await fetchMyBlockIds();
  if (!ids.length) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids);
  return data ?? [];
}

export async function muteUser(targetId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in required");
  if (u.user.id === targetId) return;
  const { error } = await supabase.from("mutes").insert({ muter_id: u.user.id, muted_id: targetId });
  if (error && !/duplicate/i.test(error.message)) throw error;
}

export async function unmuteUser(targetId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in required");
  const { error } = await supabase.from("mutes").delete().match({ muter_id: u.user.id, muted_id: targetId });
  if (error) throw error;
}

export async function fetchMyMuteIds(): Promise<string[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data } = await supabase.from("mutes").select("muted_id").eq("muter_id", u.user.id);
  return (data ?? []).map((r: any) => r.muted_id);
}

export async function fetchMyMutes() {
  const ids = await fetchMyMuteIds();
  if (!ids.length) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids);
  return data ?? [];
}

// ---------- Mod actions on content/users ----------
export async function modDeleteHowl(howlId: string, reason?: string) {
  const { data: media } = await supabase.from("howl_media").select("storage_path").eq("howl_id", howlId);
  const { error } = await supabase.from("howls").delete().eq("id", howlId);
  if (error) throw error;
  if (media?.length) await supabase.storage.from("howl-media").remove(media.map((m: any) => m.storage_path));
  await logModAction("delete_howl", "howl", howlId, reason);
}

export async function modDeleteEcho(echoId: string, reason?: string) {
  const { error } = await supabase.from("howl_echoes").delete().eq("id", echoId);
  if (error) throw error;
  await logModAction("delete_echo", "echo", echoId, reason);
}

export async function setUserModStatus(
  userId: string,
  status: "active" | "suspended" | "banned" | "shadow_banned",
  opts?: { until?: string | null; reason?: string },
) {
  const { error } = await supabase
    .from("profiles")
    .update({
      mod_status: status,
      suspended_until: opts?.until ?? null,
      mod_reason: opts?.reason ?? null,
    })
    .eq("id", userId);
  if (error) throw error;
  await logModAction(`set_status_${status}`, "user", userId, opts?.reason);
}

export async function setVerified(userId: string, verified: boolean) {
  const { error } = await supabase.from("profiles").update({ is_verified: verified }).eq("id", userId);
  if (error) throw error;
  await logModAction(verified ? "grant_verification" : "revoke_verification", "user", userId);
}

export async function setFeatured(howlId: string, featured: boolean) {
  const { error } = await supabase
    .from("howls")
    .update({ featured_at: featured ? new Date().toISOString() : null })
    .eq("id", howlId);
  if (error) throw error;
  await logModAction(featured ? "feature_howl" : "unfeature_howl", "howl", howlId);
}

export async function issueWarning(userId: string, reason: string) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("warnings")
    .insert({ user_id: userId, issued_by: u.user?.id ?? null, reason: reason.trim().slice(0, 500) });
  if (error) throw error;
  await logModAction("warn_user", "user", userId, reason);
}

export async function fetchMyWarnings() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data } = await supabase
    .from("warnings")
    .select("*")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function acknowledgeWarning(id: string) {
  const { error } = await supabase
    .from("warnings")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ---------- Announcements ----------
export async function fetchActiveAnnouncements() {
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(5);
  return data ?? [];
}

export async function fetchAllAnnouncements() {
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function createAnnouncement(title: string, body: string) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("announcements")
    .insert({ title: title.trim().slice(0, 120), body: body.trim().slice(0, 4000), author_id: u.user?.id ?? null });
  if (error) throw error;
  await logModAction("create_announcement", "announcement", "n/a");
}

export async function toggleAnnouncement(id: string, active: boolean) {
  const { error } = await supabase.from("announcements").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Logs ----------
export async function logModAction(action: string, target_type: string, target_id: string, notes?: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from("moderation_logs").insert({
    actor_id: u.user.id,
    action,
    target_type,
    target_id: /^[0-9a-f-]{36}$/i.test(target_id) ? target_id : null,
    notes: notes ?? null,
  });
}

export async function fetchModLogs() {
  const { data } = await supabase
    .from("moderation_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  return data ?? [];
}

// ---------- Admin dashboard stats ----------
export async function fetchAdminStats() {
  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const [users, activeUsers, howls, videos, echoes, reports] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("howls").select("author_id", { count: "exact", head: true }).gte("created_at", since30),
    supabase.from("howls").select("*", { count: "exact", head: true }),
    supabase.from("howl_media").select("*", { count: "exact", head: true }).eq("media_type", "video"),
    supabase.from("howl_echoes").select("*", { count: "exact", head: true }),
    supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  return {
    totalUsers: users.count ?? 0,
    activeUsers: activeUsers.count ?? 0,
    totalHowls: howls.count ?? 0,
    totalVideos: videos.count ?? 0,
    totalEchoes: echoes.count ?? 0,
    pendingReports: reports.count ?? 0,
  };
}

export async function searchUsersAdmin(query: string) {
  const q = query.trim();
  if (!q) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_verified, mod_status, suspended_until, followers_count, created_at")
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(50);
  return data ?? [];
}

export async function searchHowlsAdmin(query: string) {
  const q = query.trim();
  if (!q) return [];
  const { data } = await supabase
    .from("howls")
    .select("id, author_id, content, view_count, howl_count, echo_count, created_at, featured_at")
    .ilike("content", `%${q}%`)
    .limit(50);
  return data ?? [];
}