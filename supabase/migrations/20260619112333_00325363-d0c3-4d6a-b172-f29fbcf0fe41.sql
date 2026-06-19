
-- Add follower/following counts to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS followers_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count INT NOT NULL DEFAULT 0;

-- Follows table (Pack Members / Following Pack)
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are readable by all authenticated"
  ON public.follows FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can follow as themselves"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow as themselves"
  ON public.follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

CREATE INDEX IF NOT EXISTS follows_following_idx ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS follows_follower_idx ON public.follows(follower_id);

-- Counter trigger
CREATE OR REPLACE FUNCTION public.tg_follows_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
    UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS follows_counts_trg ON public.follows;
CREATE TRIGGER follows_counts_trg
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.tg_follows_counts();

-- Allow authenticated users to read all profiles (for suggested pack, public profile views)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Profiles are viewable by authenticated'
  ) THEN
    CREATE POLICY "Profiles are viewable by authenticated"
      ON public.profiles FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
