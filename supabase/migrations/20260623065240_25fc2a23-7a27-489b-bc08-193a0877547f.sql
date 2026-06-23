
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_howls_author_created ON public.howls (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_howls_created_at ON public.howls (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_howls_content_trgm ON public.howls USING gin (content public.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_howl_media_howl ON public.howl_media (howl_id);
CREATE INDEX IF NOT EXISTS idx_howl_echoes_howl_created ON public.howl_echoes (howl_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_howl_likes_user ON public.howl_likes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows (following_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_users ON public.conversations (user_a, user_b);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON public.conversations (last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON public.profiles USING gin (username public.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_display_trgm ON public.profiles USING gin (display_name public.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_hashtags_count ON public.hashtags (howl_count DESC, last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_howl_hashtags_tag ON public.howl_hashtags (tag);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.bookmarks (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.typing_indicators (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.typing_indicators TO authenticated;
GRANT ALL ON public.typing_indicators TO service_role;

ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation participants can read typing"
  ON public.typing_indicators FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b)
  ));

CREATE POLICY "Users manage own typing indicator"
  ON public.typing_indicators FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
