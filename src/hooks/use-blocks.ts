import { useEffect, useState, useCallback } from "react";
import { fetchMyBlockIds, fetchMyMuteIds } from "@/lib/moderation";
import { supabase } from "@/integrations/supabase/client";

export function useBlocksAndMutes() {
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [muted, setMuted] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const [b, m] = await Promise.all([fetchMyBlockIds(), fetchMyMuteIds()]);
    setBlocked(new Set(b));
    setMuted(new Set(m));
  }, []);

  useEffect(() => {
    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  return { blocked, muted, refresh };
}