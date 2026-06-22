
-- =============== Reports ===============
CREATE TYPE public.report_target AS ENUM ('user','howl','echo','message');
CREATE TYPE public.report_status AS ENUM ('pending','reviewing','resolved','dismissed');

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type public.report_target NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status public.report_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_status ON public.reports(status, created_at DESC);
CREATE INDEX idx_reports_target ON public.reports(target_type, target_id);

GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create their own reports" ON public.reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Reporter sees own reports" ON public.reports
  FOR SELECT TO authenticated USING (auth.uid() = reporter_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Mods update reports" ON public.reports
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

-- =============== Blocks ===============
CREATE TABLE public.blocks (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX idx_blocks_blocked ON public.blocks(blocked_id);
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own blocks" ON public.blocks
  FOR ALL TO authenticated USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users see if blocked by someone" ON public.blocks
  FOR SELECT TO authenticated USING (auth.uid() = blocked_id);

-- =============== Mutes ===============
CREATE TABLE public.mutes (
  muter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (muter_id, muted_id),
  CHECK (muter_id <> muted_id)
);
GRANT SELECT, INSERT, DELETE ON public.mutes TO authenticated;
GRANT ALL ON public.mutes TO service_role;
ALTER TABLE public.mutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own mutes" ON public.mutes
  FOR ALL TO authenticated USING (auth.uid() = muter_id) WITH CHECK (auth.uid() = muter_id);

-- =============== User moderation status ===============
CREATE TYPE public.user_mod_status AS ENUM ('active','suspended','banned','shadow_banned');

ALTER TABLE public.profiles
  ADD COLUMN mod_status public.user_mod_status NOT NULL DEFAULT 'active',
  ADD COLUMN suspended_until TIMESTAMPTZ,
  ADD COLUMN mod_reason TEXT;

-- =============== Warnings ===============
CREATE TABLE public.warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issued_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_warnings_user ON public.warnings(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.warnings TO authenticated;
GRANT ALL ON public.warnings TO service_role;
ALTER TABLE public.warnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User reads own warnings" ON public.warnings
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "User acknowledges own warning" ON public.warnings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Mods create warnings" ON public.warnings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

-- =============== Moderation logs ===============
CREATE TABLE public.moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_modlogs_created ON public.moderation_logs(created_at DESC);
GRANT SELECT, INSERT ON public.moderation_logs TO authenticated;
GRANT ALL ON public.moderation_logs TO service_role;
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mods read logs" ON public.moderation_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Mods write logs" ON public.moderation_logs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

-- =============== Announcements ===============
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in reads active" ON public.announcements
  FOR SELECT TO authenticated USING (active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage announcements" ON public.announcements
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =============== Featured posts ===============
ALTER TABLE public.howls ADD COLUMN featured_at TIMESTAMPTZ;
CREATE INDEX idx_howls_featured ON public.howls(featured_at DESC) WHERE featured_at IS NOT NULL;

-- =============== Rate limits (ad-hoc) ===============
CREATE TABLE public.rate_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, action, window_start)
);
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits(user_id, action, window_start DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limits TO authenticated;
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own rate limit rows" ON public.rate_limits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- =============== Rate limit RPC ===============
CREATE OR REPLACE FUNCTION public.check_rate_limit(_action TEXT, _max INT, _window_seconds INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  bucket TIMESTAMPTZ;
  current_count INT;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  bucket := date_trunc('second', now()) - (extract(epoch from now())::int % _window_seconds) * interval '1 second';
  INSERT INTO public.rate_limits(user_id, action, window_start, count)
    VALUES (uid, _action, bucket, 1)
    ON CONFLICT (user_id, action, window_start)
    DO UPDATE SET count = public.rate_limits.count + 1
    RETURNING count INTO current_count;
  RETURN current_count <= _max;
END $$;

-- =============== Block-aware helpers ===============
CREATE OR REPLACE FUNCTION public.is_blocked_between(_a UUID, _b UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = _a AND blocked_id = _b)
       OR (blocker_id = _b AND blocked_id = _a)
  )
$$;

-- =============== Prevent DMs between blocked users ===============
CREATE OR REPLACE FUNCTION public.tg_block_dm()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ua UUID; ub UUID; other UUID;
BEGIN
  SELECT user_a, user_b INTO ua, ub FROM public.conversations WHERE id = NEW.conversation_id;
  other := CASE WHEN NEW.sender_id = ua THEN ub ELSE ua END;
  IF public.is_blocked_between(NEW.sender_id, other) THEN
    RAISE EXCEPTION 'Cannot send message: user has blocked you or you have blocked them';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_block_dm BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_block_dm();

-- =============== Realtime ===============
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.warnings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
