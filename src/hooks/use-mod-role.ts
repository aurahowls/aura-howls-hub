import { useEffect, useState } from "react";
import { fetchModRole, type ModRole } from "@/lib/moderation";
import { supabase } from "@/integrations/supabase/client";

export function useModRole(): ModRole & { loading: boolean } {
  const [role, setRole] = useState<ModRole>({ isAdmin: false, isModerator: false });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetchModRole().then((r) => {
      if (!cancelled) {
        setRole(r);
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      fetchModRole().then((r) => !cancelled && setRole(r));
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);
  return { ...role, loading };
}