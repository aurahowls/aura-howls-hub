import { supabase } from "@/integrations/supabase/client";

export type PollOption = {
  id: string;
  idx: number;
  text: string;
  vote_count: number;
};

export type PollRecord = {
  id: string;
  howl_id: string;
  expires_at: string | null;
  options: PollOption[];
  total_votes: number;
  my_vote: string | null;
};

export async function fetchPollForHowl(howlId: string): Promise<PollRecord | null> {
  const { data: poll } = await supabase
    .from("polls")
    .select("id, howl_id, expires_at, options:poll_options(id, idx, text, vote_count)")
    .eq("howl_id", howlId)
    .maybeSingle();
  if (!poll) return null;
  const opts = (poll.options as PollOption[]).slice().sort((a, b) => a.idx - b.idx);
  const total = opts.reduce((s, o) => s + o.vote_count, 0);
  const { data: u } = await supabase.auth.getUser();
  let my_vote: string | null = null;
  if (u.user) {
    const { data: v } = await supabase
      .from("poll_votes")
      .select("option_id")
      .eq("poll_id", poll.id)
      .eq("user_id", u.user.id)
      .maybeSingle();
    my_vote = v?.option_id ?? null;
  }
  return {
    id: poll.id,
    howl_id: poll.howl_id,
    expires_at: poll.expires_at,
    options: opts,
    total_votes: total,
    my_vote,
  };
}

export async function vote(pollId: string, optionId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in to vote");
  const { error } = await supabase
    .from("poll_votes")
    .insert({ poll_id: pollId, user_id: u.user.id, option_id: optionId });
  if (error) throw error;
}

export async function createPollForHowl(
  howlId: string,
  options: string[],
  expiresAt: string | null,
) {
  if (options.length < 2 || options.length > 4) throw new Error("Poll needs 2–4 options");
  const { data: poll, error } = await supabase
    .from("polls")
    .insert({ howl_id: howlId, expires_at: expiresAt })
    .select("id")
    .single();
  if (error || !poll) throw error ?? new Error("Failed to create poll");
  const rows = options.map((text, idx) => ({ poll_id: poll.id, idx, text }));
  const { error: oErr } = await supabase.from("poll_options").insert(rows);
  if (oErr) throw oErr;
  return poll.id;
}

export function isPollExpired(p: PollRecord): boolean {
  return !!p.expires_at && new Date(p.expires_at).getTime() < Date.now();
}