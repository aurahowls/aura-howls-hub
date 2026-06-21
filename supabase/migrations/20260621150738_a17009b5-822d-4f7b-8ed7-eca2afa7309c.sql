
-- ============ ROLES ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ PROFILES: verification flag ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

-- ============ HOWLS: saved_count ============
ALTER TABLE public.howls ADD COLUMN IF NOT EXISTS saved_count INTEGER NOT NULL DEFAULT 0;

-- ============ BOOKMARKS ============
CREATE TABLE IF NOT EXISTS public.bookmarks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  howl_id UUID NOT NULL REFERENCES public.howls(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, howl_id)
);
GRANT SELECT, INSERT, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own bookmarks read" ON public.bookmarks FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own bookmarks insert" ON public.bookmarks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own bookmarks delete" ON public.bookmarks FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.tg_bookmark_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.howls SET saved_count = saved_count + 1 WHERE id = NEW.howl_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.howls SET saved_count = GREATEST(0, saved_count - 1) WHERE id = OLD.howl_id;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS bookmark_count_trg ON public.bookmarks;
CREATE TRIGGER bookmark_count_trg AFTER INSERT OR DELETE ON public.bookmarks
FOR EACH ROW EXECUTE FUNCTION public.tg_bookmark_count();

-- ============ HASHTAGS ============
CREATE TABLE IF NOT EXISTS public.hashtags (
  tag TEXT PRIMARY KEY,
  howl_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hashtags TO authenticated, anon;
GRANT ALL ON public.hashtags TO service_role;
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read hashtags" ON public.hashtags FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE IF NOT EXISTS public.howl_hashtags (
  howl_id UUID NOT NULL REFERENCES public.howls(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (howl_id, tag)
);
CREATE INDEX IF NOT EXISTS howl_hashtags_tag_idx ON public.howl_hashtags(tag);
GRANT SELECT ON public.howl_hashtags TO authenticated, anon;
GRANT ALL ON public.howl_hashtags TO service_role;
ALTER TABLE public.howl_hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read howl_hashtags" ON public.howl_hashtags FOR SELECT TO authenticated, anon USING (true);

CREATE OR REPLACE FUNCTION public.tg_extract_hashtags() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM public.howl_hashtags WHERE howl_id = NEW.id;
  END IF;
  IF NEW.content IS NOT NULL THEN
    FOR m IN SELECT DISTINCT lower(x[1]) FROM regexp_matches(NEW.content, '#([A-Za-z0-9_]{2,40})', 'g') AS x LOOP
      INSERT INTO public.hashtags(tag, howl_count, last_used_at)
        VALUES (m, 1, now())
        ON CONFLICT (tag) DO UPDATE SET howl_count = public.hashtags.howl_count + 1, last_used_at = now();
      INSERT INTO public.howl_hashtags(howl_id, tag) VALUES (NEW.id, m)
        ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS extract_hashtags_trg ON public.howls;
CREATE TRIGGER extract_hashtags_trg AFTER INSERT OR UPDATE OF content ON public.howls
FOR EACH ROW EXECUTE FUNCTION public.tg_extract_hashtags();

-- ============ POLLS ============
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  howl_id UUID NOT NULL UNIQUE REFERENCES public.howls(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.polls TO authenticated;
GRANT ALL ON public.polls TO service_role;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read polls" ON public.polls FOR SELECT TO authenticated USING (true);
CREATE POLICY "poll insert by howl author" ON public.polls FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.howls h WHERE h.id = howl_id AND h.author_id = auth.uid()));
CREATE POLICY "poll delete by author" ON public.polls FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.howls h WHERE h.id = howl_id AND h.author_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  text TEXT NOT NULL,
  vote_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE (poll_id, idx)
);
GRANT SELECT, INSERT ON public.poll_options TO authenticated;
GRANT ALL ON public.poll_options TO service_role;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read poll_options" ON public.poll_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "options insert by author" ON public.poll_options FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.polls p JOIN public.howls h ON h.id = p.howl_id
    WHERE p.id = poll_id AND h.author_id = auth.uid()
  ));

CREATE TABLE IF NOT EXISTS public.poll_votes (
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);
GRANT SELECT, INSERT ON public.poll_votes TO authenticated;
GRANT ALL ON public.poll_votes TO service_role;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read poll_votes" ON public.poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "vote insert" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.tg_poll_vote_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.poll_options SET vote_count = vote_count + 1 WHERE id = NEW.option_id;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS poll_vote_count_trg ON public.poll_votes;
CREATE TRIGGER poll_vote_count_trg AFTER INSERT ON public.poll_votes
FOR EACH ROW EXECUTE FUNCTION public.tg_poll_vote_count();

-- ============ VERIFICATION REQUESTS ============
DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status public.verification_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.verification_requests TO authenticated;
GRANT ALL ON public.verification_requests TO service_role;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own request read" ON public.verification_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own request insert" ON public.verification_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin update request" ON public.verification_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS verif_updated_at_trg ON public.verification_requests;
CREATE TRIGGER verif_updated_at_trg BEFORE UPDATE ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.tg_verif_apply() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.profiles SET is_verified = true WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS verif_apply_trg ON public.verification_requests;
CREATE TRIGGER verif_apply_trg AFTER UPDATE ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_verif_apply();

-- ============ RECENT SEARCHES ============
CREATE TABLE IF NOT EXISTS public.recent_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, query)
);
CREATE INDEX IF NOT EXISTS recent_searches_user_idx ON public.recent_searches(user_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.recent_searches TO authenticated;
GRANT ALL ON public.recent_searches TO service_role;
ALTER TABLE public.recent_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recent read" ON public.recent_searches FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own recent write" ON public.recent_searches FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own recent delete" ON public.recent_searches FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookmarks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_options;
