
-- =========================
-- NOTIFICATIONS
-- =========================
CREATE TYPE public.notification_type AS ENUM ('follow','howl_like','echo','rehowl','mention','dm');

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  howl_id UUID REFERENCES public.howls(id) ON DELETE CASCADE,
  echo_id UUID REFERENCES public.howl_echoes(id) ON DELETE CASCADE,
  conversation_id UUID,
  message_id UUID,
  preview TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE read = false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipient can read alerts" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "recipient can update alerts" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recipient can delete alerts" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- inserts performed by SECURITY DEFINER triggers; no insert policy needed

-- =========================
-- CONVERSATIONS / MESSAGES
-- =========================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conv_user_order CHECK (user_a < user_b),
  CONSTRAINT conv_unique UNIQUE (user_a, user_b)
);
CREATE INDEX idx_conv_user_a ON public.conversations(user_a, last_message_at DESC);
CREATE INDEX idx_conv_user_b ON public.conversations(user_b, last_message_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read conversations" ON public.conversations
  FOR SELECT TO authenticated USING (auth.uid() IN (user_a, user_b));
CREATE POLICY "users create conversations they belong to" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (user_a, user_b));
CREATE POLICY "participants update conversations" ON public.conversations
  FOR UPDATE TO authenticated USING (auth.uid() IN (user_a, user_b)) WITH CHECK (auth.uid() IN (user_a, user_b));

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  media_path TEXT,
  media_type TEXT CHECK (media_type IN ('image','video')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conv_created ON public.messages(conversation_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read messages" ON public.messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b))
  );
CREATE POLICY "sender sends own messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b)
    )
  );
CREATE POLICY "sender deletes own messages" ON public.messages
  FOR DELETE TO authenticated USING (auth.uid() = sender_id);

CREATE TABLE public.message_reads (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reads TO authenticated;
GRANT ALL ON public.message_reads TO service_role;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read receipts" ON public.message_reads
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b))
  );
CREATE POLICY "user upserts own receipt" ON public.message_reads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user updates own receipt" ON public.message_reads
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- TRIGGERS: notifications
-- =========================
CREATE OR REPLACE FUNCTION public.notify_follow() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.follower_id <> NEW.following_id THEN
    INSERT INTO public.notifications(user_id, actor_id, type)
    VALUES (NEW.following_id, NEW.follower_id, 'follow');
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_notify_follow AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_follow();

CREATE OR REPLACE FUNCTION public.notify_howl_like() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID;
BEGIN
  SELECT author_id INTO owner FROM public.howls WHERE id = NEW.howl_id;
  IF owner IS NOT NULL AND owner <> NEW.user_id THEN
    INSERT INTO public.notifications(user_id, actor_id, type, howl_id)
    VALUES (owner, NEW.user_id, 'howl_like', NEW.howl_id);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_notify_howl_like AFTER INSERT ON public.howl_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_howl_like();

CREATE OR REPLACE FUNCTION public.notify_rehowl() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID;
BEGIN
  SELECT author_id INTO owner FROM public.howls WHERE id = NEW.howl_id;
  IF owner IS NOT NULL AND owner <> NEW.user_id THEN
    INSERT INTO public.notifications(user_id, actor_id, type, howl_id)
    VALUES (owner, NEW.user_id, 'rehowl', NEW.howl_id);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_notify_rehowl AFTER INSERT ON public.howl_rehowls
  FOR EACH ROW EXECUTE FUNCTION public.notify_rehowl();

CREATE OR REPLACE FUNCTION public.notify_echo() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID;
BEGIN
  SELECT author_id INTO owner FROM public.howls WHERE id = NEW.howl_id;
  IF owner IS NOT NULL AND owner <> NEW.author_id THEN
    INSERT INTO public.notifications(user_id, actor_id, type, howl_id, echo_id, preview)
    VALUES (owner, NEW.author_id, 'echo', NEW.howl_id, NEW.id, left(NEW.content, 140));
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_notify_echo AFTER INSERT ON public.howl_echoes
  FOR EACH ROW EXECUTE FUNCTION public.notify_echo();

CREATE OR REPLACE FUNCTION public.notify_mentions() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE handle TEXT; uid UUID;
BEGIN
  IF NEW.content IS NULL THEN RETURN NULL; END IF;
  FOR handle IN
    SELECT DISTINCT lower(m[1]) FROM regexp_matches(NEW.content, '@([A-Za-z0-9_]{2,32})', 'g') AS m
  LOOP
    SELECT id INTO uid FROM public.profiles WHERE username = handle LIMIT 1;
    IF uid IS NOT NULL AND uid <> NEW.author_id THEN
      INSERT INTO public.notifications(user_id, actor_id, type, howl_id, preview)
      VALUES (uid, NEW.author_id, 'mention', NEW.id, left(NEW.content, 140));
    END IF;
  END LOOP;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_notify_mentions AFTER INSERT ON public.howls
  FOR EACH ROW EXECUTE FUNCTION public.notify_mentions();

CREATE OR REPLACE FUNCTION public.notify_dm() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient UUID; ua UUID; ub UUID;
BEGIN
  SELECT user_a, user_b INTO ua, ub FROM public.conversations WHERE id = NEW.conversation_id;
  recipient := CASE WHEN NEW.sender_id = ua THEN ub ELSE ua END;
  UPDATE public.conversations
     SET last_message_at = NEW.created_at,
         last_message_preview = COALESCE(left(NEW.content, 140), CASE WHEN NEW.media_type = 'image' THEN '📷 Image' WHEN NEW.media_type = 'video' THEN '🎬 Video' ELSE '' END)
   WHERE id = NEW.conversation_id;
  INSERT INTO public.notifications(user_id, actor_id, type, conversation_id, message_id, preview)
  VALUES (recipient, NEW.sender_id, 'dm', NEW.conversation_id, NEW.id,
          COALESCE(left(NEW.content, 140), CASE WHEN NEW.media_type = 'image' THEN '📷 Image' WHEN NEW.media_type = 'video' THEN '🎬 Video' ELSE '' END));
  RETURN NULL;
END $$;
CREATE TRIGGER trg_notify_dm AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_dm();

-- =========================
-- REALTIME
-- =========================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;
