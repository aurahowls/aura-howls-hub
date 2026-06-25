-- Phase 3: Security & Authentication

-- =============== User Privacy Settings ===============
CREATE TABLE IF NOT EXISTS public.user_privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_private BOOLEAN NOT NULL DEFAULT false,
  hide_online_status BOOLEAN NOT NULL DEFAULT false,
  disable_dms BOOLEAN NOT NULL DEFAULT false,
  restrict_mentions TEXT NOT NULL DEFAULT 'everyone',
  restrict_comments TEXT NOT NULL DEFAULT 'everyone',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_privacy_settings TO authenticated;
GRANT SELECT ON public.user_privacy_settings TO anon;
GRANT ALL ON public.user_privacy_settings TO service_role;
ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view privacy settings" ON public.user_privacy_settings
  FOR SELECT USING (true);
CREATE POLICY "Users manage own privacy settings" ON public.user_privacy_settings
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============== Security Events (audit log) ===============
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_hint TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_user_created
  ON public.security_events(user_id, created_at DESC);

GRANT SELECT, INSERT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own security events" ON public.security_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own security events" ON public.security_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =============== RPC: upsert privacy settings ===============
CREATE OR REPLACE FUNCTION public.upsert_privacy_settings(
  _is_private BOOLEAN,
  _hide_online_status BOOLEAN,
  _disable_dms BOOLEAN,
  _restrict_mentions TEXT,
  _restrict_comments TEXT
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_privacy_settings(
    user_id, is_private, hide_online_status, disable_dms,
    restrict_mentions, restrict_comments
  )
  VALUES (
    auth.uid(), _is_private, _hide_online_status, _disable_dms,
    _restrict_mentions, _restrict_comments
  )
  ON CONFLICT (user_id) DO UPDATE SET
    is_private = EXCLUDED.is_private,
    hide_online_status = EXCLUDED.hide_online_status,
    disable_dms = EXCLUDED.disable_dms,
    restrict_mentions = EXCLUDED.restrict_mentions,
    restrict_comments = EXCLUDED.restrict_comments,
    updated_at = now();
END $$;

GRANT EXECUTE ON FUNCTION public.upsert_privacy_settings TO authenticated;

-- =============== RPC: duplicate howl detection ===============
CREATE OR REPLACE FUNCTION public.check_duplicate_howl(_content TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL OR _content IS NULL OR trim(_content) = '' THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.howls
    WHERE author_id = uid
      AND content = trim(_content)
      AND created_at > now() - interval '10 minutes'
  );
END $$;

GRANT EXECUTE ON FUNCTION public.check_duplicate_howl TO authenticated;

-- =============== Rate limit: log_security_event RPC ===============
CREATE OR REPLACE FUNCTION public.log_security_event(
  _event_type TEXT,
  _user_agent TEXT DEFAULT NULL,
  _device_hint TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_events(user_id, event_type, user_agent, device_hint, metadata)
    VALUES (auth.uid(), _event_type, _user_agent, _device_hint, _metadata);
END $$;

GRANT EXECUTE ON FUNCTION public.log_security_event TO authenticated;
