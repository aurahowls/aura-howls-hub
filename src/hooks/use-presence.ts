import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";

/**
 * Tracks which users are currently online via a global Supabase presence channel.
 */
export function usePresence(watchUserIds: string[] = []) {
  const { user } = useCurrentUser();
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("global-presence", {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnline(new Set(Object.keys(state)));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  if (watchUserIds.length === 0) return online;
  const filtered = new Set<string>();
  for (const id of watchUserIds) if (online.has(id)) filtered.add(id);
  return filtered;
}