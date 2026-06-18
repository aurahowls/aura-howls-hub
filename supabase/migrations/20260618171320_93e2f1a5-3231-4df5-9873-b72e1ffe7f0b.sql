
-- Howls
CREATE TABLE public.howls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  view_count integer NOT NULL DEFAULT 0,
  howl_count integer NOT NULL DEFAULT 0,
  echo_count integer NOT NULL DEFAULT 0,
  rehowl_count integer NOT NULL DEFAULT 0,
  edited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.howls TO authenticated;
GRANT SELECT ON public.howls TO anon;
GRANT ALL ON public.howls TO service_role;
ALTER TABLE public.howls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Howls are viewable by everyone" ON public.howls FOR SELECT USING (true);
CREATE POLICY "Users can create their own howls" ON public.howls FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update their own howls" ON public.howls FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete their own howls" ON public.howls FOR DELETE TO authenticated USING (auth.uid() = author_id);
CREATE INDEX howls_author_created_idx ON public.howls (author_id, created_at DESC);
CREATE INDEX howls_created_idx ON public.howls (created_at DESC);

CREATE TRIGGER update_howls_updated_at BEFORE UPDATE ON public.howls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Howl media (images / video)
CREATE TABLE public.howl_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  howl_id uuid NOT NULL REFERENCES public.howls(id) ON DELETE CASCADE,
  url text NOT NULL,
  storage_path text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image','video')),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.howl_media TO authenticated;
GRANT SELECT ON public.howl_media TO anon;
GRANT ALL ON public.howl_media TO service_role;
ALTER TABLE public.howl_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Howl media viewable by everyone" ON public.howl_media FOR SELECT USING (true);
CREATE POLICY "Users can add media to own howls" ON public.howl_media FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.howls h WHERE h.id = howl_id AND h.author_id = auth.uid()));
CREATE POLICY "Users can delete media from own howls" ON public.howl_media FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.howls h WHERE h.id = howl_id AND h.author_id = auth.uid()));
CREATE INDEX howl_media_howl_idx ON public.howl_media (howl_id, position);

-- Likes (🐺 Howl reactions)
CREATE TABLE public.howl_likes (
  howl_id uuid NOT NULL REFERENCES public.howls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (howl_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.howl_likes TO authenticated;
GRANT SELECT ON public.howl_likes TO anon;
GRANT ALL ON public.howl_likes TO service_role;
ALTER TABLE public.howl_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes viewable by everyone" ON public.howl_likes FOR SELECT USING (true);
CREATE POLICY "Users can like" ON public.howl_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.howl_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Rehowls
CREATE TABLE public.howl_rehowls (
  howl_id uuid NOT NULL REFERENCES public.howls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (howl_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.howl_rehowls TO authenticated;
GRANT SELECT ON public.howl_rehowls TO anon;
GRANT ALL ON public.howl_rehowls TO service_role;
ALTER TABLE public.howl_rehowls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rehowls viewable by everyone" ON public.howl_rehowls FOR SELECT USING (true);
CREATE POLICY "Users can rehowl" ON public.howl_rehowls FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unrehowl" ON public.howl_rehowls FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Echoes (comments)
CREATE TABLE public.howl_echoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  howl_id uuid NOT NULL REFERENCES public.howls(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.howl_echoes TO authenticated;
GRANT SELECT ON public.howl_echoes TO anon;
GRANT ALL ON public.howl_echoes TO service_role;
ALTER TABLE public.howl_echoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Echoes viewable by everyone" ON public.howl_echoes FOR SELECT USING (true);
CREATE POLICY "Users can echo" ON public.howl_echoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can edit own echoes" ON public.howl_echoes FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete own echoes" ON public.howl_echoes FOR DELETE TO authenticated USING (auth.uid() = author_id);
CREATE INDEX howl_echoes_howl_idx ON public.howl_echoes (howl_id, created_at DESC);
CREATE TRIGGER update_howl_echoes_updated_at BEFORE UPDATE ON public.howl_echoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Counter maintenance triggers
CREATE OR REPLACE FUNCTION public.bump_howl_counter(_howl uuid, _col text, _delta int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  EXECUTE format('UPDATE public.howls SET %I = GREATEST(0, %I + $1) WHERE id = $2', _col, _col) USING _delta, _howl;
END $$;

CREATE OR REPLACE FUNCTION public.tg_howl_likes_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN PERFORM bump_howl_counter(NEW.howl_id, 'howl_count', 1);
  ELSIF TG_OP = 'DELETE' THEN PERFORM bump_howl_counter(OLD.howl_id, 'howl_count', -1);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER howl_likes_count_trg AFTER INSERT OR DELETE ON public.howl_likes FOR EACH ROW EXECUTE FUNCTION public.tg_howl_likes_count();

CREATE OR REPLACE FUNCTION public.tg_howl_rehowls_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN PERFORM bump_howl_counter(NEW.howl_id, 'rehowl_count', 1);
  ELSIF TG_OP = 'DELETE' THEN PERFORM bump_howl_counter(OLD.howl_id, 'rehowl_count', -1);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER howl_rehowls_count_trg AFTER INSERT OR DELETE ON public.howl_rehowls FOR EACH ROW EXECUTE FUNCTION public.tg_howl_rehowls_count();

CREATE OR REPLACE FUNCTION public.tg_howl_echoes_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN PERFORM bump_howl_counter(NEW.howl_id, 'echo_count', 1);
  ELSIF TG_OP = 'DELETE' THEN PERFORM bump_howl_counter(OLD.howl_id, 'echo_count', -1);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER howl_echoes_count_trg AFTER INSERT OR DELETE ON public.howl_echoes FOR EACH ROW EXECUTE FUNCTION public.tg_howl_echoes_count();

-- View count RPC (callable by anyone, increments only)
CREATE OR REPLACE FUNCTION public.increment_howl_view(_howl uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.howls SET view_count = view_count + 1 WHERE id = _howl;
END $$;
GRANT EXECUTE ON FUNCTION public.increment_howl_view(uuid) TO anon, authenticated;
