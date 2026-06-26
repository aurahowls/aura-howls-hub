import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  created_at: string;
  followers_count: number;
  following_count: number;
  is_verified: boolean;
};

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile(uid: string) {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      if (!cancelled) setProfile(p as Profile | null);
    }

    async function load() {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      setUser(data.user);
      if (data.user) {
        userId.current = data.user.id;
        await loadProfile(data.user.id);
      }
      if (!cancelled) setLoading(false);
    }

    load();

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        userId.current = u.id;
        void loadProfile(u.id);
      } else {
        userId.current = null;
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      authSub.subscription.unsubscribe();
    };
  }, []);

  // Real-time subscription: keep profile in sync with DB changes
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`profile-realtime-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          setProfile((prev) =>
            prev ? { ...prev, ...(payload.new as Partial<Profile>) } : (payload.new as Profile),
          );
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id]);

  function refresh() {
    if (userId.current) {
      supabase
        .from("profiles")
        .select("*")
        .eq("id", userId.current)
        .maybeSingle()
        .then(({ data }) => setProfile(data as Profile | null));
    }
  }

  return { user, profile, loading, refresh };
}
