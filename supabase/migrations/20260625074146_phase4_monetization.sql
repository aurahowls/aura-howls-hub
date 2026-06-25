-- Phase 4: Creator Economy & Monetization
-- Phase 5: Launch Readiness DB additions

-- 1. Wolf+ Premium subscriptions
CREATE TABLE IF NOT EXISTS wolf_plus_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  tier TEXT NOT NULL DEFAULT 'monthly',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE wolf_plus_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own wp sub" ON wolf_plus_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins manage wp subs" ON wolf_plus_subscriptions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Creator plans
CREATE TABLE IF NOT EXISTS creator_plans (
  creator_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  price_usd_cents INT NOT NULL DEFAULT 499,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE creator_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads active plans" ON creator_plans FOR SELECT USING (is_active = true OR creator_id = auth.uid());
CREATE POLICY "creator manages own plan" ON creator_plans FOR ALL USING (auth.uid() = creator_id);

-- 3. Creator subscriptions
CREATE TABLE IF NOT EXISTS creator_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(subscriber_id, creator_id)
);
ALTER TABLE creator_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own creator subs" ON creator_subscriptions FOR SELECT
  USING (auth.uid() = subscriber_id OR auth.uid() = creator_id);
CREATE POLICY "users insert own creator subs" ON creator_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = subscriber_id);
CREATE POLICY "users update own creator subs" ON creator_subscriptions FOR UPDATE
  USING (auth.uid() = subscriber_id);

-- 4. Tips
CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipper_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  howl_id UUID REFERENCES howls(id) ON DELETE SET NULL,
  amount_usd_cents INT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tipper and recipient view tips" ON tips FOR SELECT
  USING (auth.uid() = tipper_id OR auth.uid() = recipient_id);
CREATE POLICY "users insert tips" ON tips FOR INSERT WITH CHECK (auth.uid() = tipper_id);

-- Tip leaderboard view
CREATE OR REPLACE VIEW tips_leaderboard AS
  SELECT
    recipient_id,
    SUM(amount_usd_cents) AS total_cents,
    COUNT(*) AS tip_count
  FROM tips
  GROUP BY recipient_id
  ORDER BY total_cents DESC;

-- 5. Subscriber-only flag on howls
ALTER TABLE howls ADD COLUMN IF NOT EXISTS is_subscriber_only BOOLEAN NOT NULL DEFAULT false;

-- 6. Promoted howls
CREATE TABLE IF NOT EXISTS promoted_howls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  howl_id UUID NOT NULL REFERENCES howls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_usd_cents INT NOT NULL DEFAULT 1000,
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE promoted_howls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user manages own promotions" ON promoted_howls FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "anyone views active promotions" ON promoted_howls FOR SELECT USING (status = 'active');

-- 7. Business/Creator profile fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS creator_price_usd_cents INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_website TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wolf_plus_active BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_tips_received_cents INT NOT NULL DEFAULT 0;

-- 8. Ad slots (foundation)
CREATE TABLE IF NOT EXISTS ad_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_name TEXT NOT NULL UNIQUE,
  slot_type TEXT NOT NULL DEFAULT 'native',
  is_active BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE ad_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read active ad slots" ON ad_slots FOR SELECT USING (is_active = true);
CREATE POLICY "admins manage ad slots" ON ad_slots FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

INSERT INTO ad_slots (slot_name, slot_type, is_active) VALUES
  ('feed_native_1', 'native', false),
  ('sidebar_top', 'sidebar', false),
  ('profile_banner', 'banner', false)
ON CONFLICT (slot_name) DO NOTHING;

-- 9. Invite codes (Phase 5 beta launch)
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  max_uses INT NOT NULL DEFAULT 1,
  use_count INT NOT NULL DEFAULT 0,
  notes TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage invite codes" ON invite_codes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE TABLE IF NOT EXISTS invite_uses (
  invite_id UUID NOT NULL REFERENCES invite_codes(id) ON DELETE CASCADE,
  used_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (invite_id, used_by)
);
ALTER TABLE invite_uses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins view invite uses" ON invite_uses FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 10. Performance indexes (Phase 5)
CREATE INDEX IF NOT EXISTS idx_tips_recipient ON tips (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_tipper ON tips (tipper_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promoted_howls_status ON promoted_howls (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_creator_subs_creator ON creator_subscriptions (creator_id, status);
CREATE INDEX IF NOT EXISTS idx_creator_subs_subscriber ON creator_subscriptions (subscriber_id, status);
CREATE INDEX IF NOT EXISTS idx_howls_subscriber_only ON howls (author_id, is_subscriber_only);
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON profiles (account_type);

-- 11. RPCs

CREATE OR REPLACE FUNCTION upsert_creator_plan(
  _price_usd_cents INT,
  _description TEXT,
  _is_active BOOLEAN
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO creator_plans (creator_id, price_usd_cents, description, is_active, updated_at)
    VALUES (auth.uid(), _price_usd_cents, _description, _is_active, now())
  ON CONFLICT (creator_id) DO UPDATE SET
    price_usd_cents = EXCLUDED.price_usd_cents,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION send_tip(
  _recipient_id UUID,
  _amount_usd_cents INT,
  _howl_id UUID DEFAULT NULL,
  _message TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _tip_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF auth.uid() = _recipient_id THEN RAISE EXCEPTION 'Cannot tip yourself'; END IF;
  IF _amount_usd_cents < 50 THEN RAISE EXCEPTION 'Minimum tip is $0.50'; END IF;
  INSERT INTO tips (tipper_id, recipient_id, howl_id, amount_usd_cents, message)
    VALUES (auth.uid(), _recipient_id, _howl_id, _amount_usd_cents, _message)
  RETURNING id INTO _tip_id;
  UPDATE profiles SET total_tips_received_cents = total_tips_received_cents + _amount_usd_cents
    WHERE id = _recipient_id;
  RETURN _tip_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_account_settings(
  _account_type TEXT DEFAULT NULL,
  _business_website TEXT DEFAULT NULL,
  _business_email TEXT DEFAULT NULL,
  _business_phone TEXT DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET
    account_type = COALESCE(_account_type, account_type),
    business_website = COALESCE(_business_website, business_website),
    business_email = COALESCE(_business_email, business_email),
    business_phone = COALESCE(_business_phone, business_phone)
  WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION promote_howl(
  _howl_id UUID,
  _budget_usd_cents INT,
  _days INT DEFAULT 7
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _promo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM howls WHERE id = _howl_id AND author_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not your howl';
  END IF;
  INSERT INTO promoted_howls (howl_id, user_id, budget_usd_cents, status, expires_at)
    VALUES (_howl_id, auth.uid(), _budget_usd_cents, 'pending', now() + (_days || ' days')::interval)
  RETURNING id INTO _promo_id;
  RETURN _promo_id;
END;
$$;

CREATE OR REPLACE FUNCTION generate_invite_code(
  _max_uses INT DEFAULT 1,
  _notes TEXT DEFAULT NULL,
  _expires_days INT DEFAULT 30
) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _code TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  _code := upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 8));
  INSERT INTO invite_codes (code, created_by, max_uses, notes, expires_at)
    VALUES (_code, auth.uid(), _max_uses, _notes, now() + (_expires_days || ' days')::interval);
  RETURN _code;
END;
$$;

CREATE OR REPLACE FUNCTION get_platform_stats() RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE _result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator')) THEN
    RAISE EXCEPTION 'Moderators only';
  END IF;
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'new_users_7d', (SELECT COUNT(*) FROM profiles WHERE created_at > now() - interval '7 days'),
    'new_users_30d', (SELECT COUNT(*) FROM profiles WHERE created_at > now() - interval '30 days'),
    'total_howls', (SELECT COUNT(*) FROM howls),
    'new_howls_7d', (SELECT COUNT(*) FROM howls WHERE created_at > now() - interval '7 days'),
    'wolf_plus_count', (SELECT COUNT(*) FROM wolf_plus_subscriptions WHERE status = 'active'),
    'creator_count', (SELECT COUNT(*) FROM profiles WHERE account_type = 'creator'),
    'business_count', (SELECT COUNT(*) FROM profiles WHERE account_type = 'business'),
    'total_tips_cents', (SELECT COALESCE(SUM(amount_usd_cents),0) FROM tips),
    'total_subscribers', (SELECT COUNT(*) FROM creator_subscriptions WHERE status = 'active'),
    'active_promotions', (SELECT COUNT(*) FROM promoted_howls WHERE status = 'active'),
    'invite_codes_active', (SELECT COUNT(*) FROM invite_codes WHERE (expires_at IS NULL OR expires_at > now()) AND use_count < max_uses)
  ) INTO _result;
  RETURN _result;
END;
$$;

CREATE OR REPLACE FUNCTION get_creator_dashboard(_creator_id UUID DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _uid UUID := COALESCE(_creator_id, auth.uid());
  _result JSONB;
BEGIN
  IF auth.uid() != _uid THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'subscriber_count', (SELECT COUNT(*) FROM creator_subscriptions WHERE creator_id = _uid AND status = 'active'),
    'total_tips_cents', (SELECT COALESCE(SUM(amount_usd_cents),0) FROM tips WHERE recipient_id = _uid),
    'tips_count', (SELECT COUNT(*) FROM tips WHERE recipient_id = _uid),
    'tips_30d_cents', (SELECT COALESCE(SUM(amount_usd_cents),0) FROM tips WHERE recipient_id = _uid AND created_at > now() - interval '30 days'),
    'howls_count', (SELECT COUNT(*) FROM howls WHERE author_id = _uid),
    'total_views', (SELECT COALESCE(SUM(view_count),0) FROM howls WHERE author_id = _uid),
    'total_likes', (SELECT COALESCE(SUM(howl_count),0) FROM howls WHERE author_id = _uid),
    'total_echoes', (SELECT COALESCE(SUM(echo_count),0) FROM howls WHERE author_id = _uid),
    'promotions_active', (SELECT COUNT(*) FROM promoted_howls WHERE user_id = _uid AND status = 'active'),
    'promotions_impressions', (SELECT COALESCE(SUM(impressions),0) FROM promoted_howls WHERE user_id = _uid),
    'promotions_clicks', (SELECT COALESCE(SUM(clicks),0) FROM promoted_howls WHERE user_id = _uid),
    'wolf_plus_active', (SELECT wolf_plus_active FROM profiles WHERE id = _uid)
  ) INTO _result;
  RETURN _result;
END;
$$;
