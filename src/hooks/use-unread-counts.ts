import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "./use-current-user";

export function useUnreadCounts() {
  const { user } = useCurrentUser();
  const [alerts, setAlerts] = useState(0);
  const [dms, setDms] = useState(0);

  useEffect(() => {
    if (!user) {
      setAlerts(0);
      setDms(0);
      return;
    }
    let cancelled = false;

    async function refresh() {
      const { count: aCount } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("read", false);
      if (!cancelled) setAlerts(aCount ?? 0);

      const { count: dCount } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("read", false)
        .eq("type", "dm");
      if (!cancelled) setDms(dCount ?? 0);
    }
    refresh();

    const channel = supabase
      .channel(`alerts-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { alerts, dms };
}