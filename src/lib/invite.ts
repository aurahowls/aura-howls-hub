import { supabase } from "@/integrations/supabase/client";

export interface InviteCode {
  id: string;
  code: string;
  created_by: string | null;
  max_uses: number;
  use_count: number;
  notes: string | null;
  expires_at: string | null;
  created_at: string;
}

export async function generateInviteCode(opts: {
  maxUses?: number;
  notes?: string;
  expiresDays?: number;
}): Promise<string> {
  const { data, error } = await supabase.rpc("generate_invite_code", {
    _max_uses: opts.maxUses ?? 1,
    _notes: opts.notes ?? null,
    _expires_days: opts.expiresDays ?? 30,
  });
  if (error) throw error;
  return data as string;
}

export async function fetchInviteCodes(): Promise<InviteCode[]> {
  const { data, error } = await supabase
    .from("invite_codes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as InviteCode[];
}

export async function deleteInviteCode(id: string) {
  const { error } = await supabase
    .from("invite_codes")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
