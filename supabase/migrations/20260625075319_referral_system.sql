-- Referral System Migration

-- 1. Wolf+ credits (earned via referrals, redeemable for Wolf+ days)
CREATE TABLE IF NOT EXISTS wolf_plus_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INT NOT NULL DEFAULT 0 CHECK (credits >= 0),
  source TEXT NOT NULL DEFAULT 'referral', -- referral, promo, gift, admin
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE wolf_plus_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own credits" ON wolf_plus_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins manage credits" ON wolf_plus_credits FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Wolf+ credit balance view per user
CREATE OR REPLACE VIEW wolf_plus_credit_balances AS
  SELECT user_id, SUM(credits) AS total_credits
  FROM wolf_plus_credits
  GROUP BY user_id;

-- 2. Referral codes (one per user, auto-generated unique code)
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user reads own referral code" ON referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "system inserts referral codes" ON referral_codes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Referral uses (tracks successful signups via referral code)
CREATE TABLE IF NOT EXISTS referral_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, rewarded
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE referral_uses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrer reads own referral uses" ON referral_uses FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "admins manage referral uses" ON referral_uses FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Performance indexes
CREATE INDEX IF NOT EXISTS idx_referral_uses_referrer ON referral_uses (referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_uses_referred ON referral_uses (referred_id);
CREATE INDEX IF NOT EXISTS idx_wolf_plus_credits_user ON wolf_plus_credits (user_id, created_at DESC);

-- 5. Add referral_code_id to profiles for quick lookup
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. RPCs

-- Get or create a referral code for the current user
CREATE OR REPLACE FUNCTION get_or_create_referral_code() RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _code TEXT;
BEGIN
  SELECT code INTO _code FROM referral_codes WHERE user_id = auth.uid();
  IF _code IS NOT NULL THEN RETURN _code; END IF;
  -- Generate a unique code
  LOOP
    _code := upper(substring(md5(random()::text || auth.uid()::text) FROM 1 FOR 8));
    BEGIN
      INSERT INTO referral_codes (user_id, code) VALUES (auth.uid(), _code);
      RETURN _code;
    EXCEPTION WHEN unique_violation THEN
      -- try again
    END;
  END LOOP;
END;
$$;

-- Apply a referral code after signup (called by new user)
CREATE OR REPLACE FUNCTION apply_referral_code(_code TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _ref RECORD;
  _use_id UUID;
  _referrer_id UUID;
  _result JSONB;
BEGIN
  -- Make sure the caller isn't already referred
  IF EXISTS (SELECT 1 FROM referral_uses WHERE referred_id = auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Already applied a referral code');
  END IF;

  -- Look up the referral code
  SELECT rc.id, rc.user_id INTO _ref FROM referral_codes rc WHERE rc.code = upper(trim(_code));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Invalid referral code');
  END IF;

  -- Cannot refer yourself
  IF _ref.user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Cannot use your own referral code');
  END IF;

  _referrer_id := _ref.user_id;

  -- Record the referral use
  INSERT INTO referral_uses (referral_code_id, referrer_id, referred_id, status)
    VALUES (_ref.id, _referrer_id, auth.uid(), 'confirmed')
  RETURNING id INTO _use_id;

  -- Mark referred_by on profile
  UPDATE profiles SET referred_by = _referrer_id WHERE id = auth.uid();

  -- Award referrer: 30 Wolf+ credits (= 30 days of Wolf+)
  INSERT INTO wolf_plus_credits (user_id, credits, source, note)
    VALUES (_referrer_id, 30, 'referral', 'Referral bonus for bringing in a new wolf');

  -- Update referral_uses status to rewarded
  UPDATE referral_uses SET status = 'rewarded', rewarded_at = now() WHERE id = _use_id;

  -- Award new user: 7 Wolf+ credits (welcome bonus)
  INSERT INTO wolf_plus_credits (user_id, credits, source, note)
    VALUES (auth.uid(), 7, 'referral', 'Welcome bonus for joining via referral');

  RETURN jsonb_build_object(
    'success', true,
    'referrer_credits_awarded', 30,
    'new_user_credits_awarded', 7
  );
END;
$$;

-- Get referral stats for the current user
CREATE OR REPLACE FUNCTION get_referral_stats() RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _result JSONB;
  _code TEXT;
  _total_credits INT;
BEGIN
  -- Get code
  SELECT code INTO _code FROM referral_codes WHERE user_id = auth.uid();

  -- Get total credits
  SELECT COALESCE(SUM(credits), 0) INTO _total_credits
    FROM wolf_plus_credits WHERE user_id = auth.uid();

  SELECT jsonb_build_object(
    'code', _code,
    'total_referrals', (
      SELECT COUNT(*) FROM referral_uses WHERE referrer_id = auth.uid()
    ),
    'rewarded_referrals', (
      SELECT COUNT(*) FROM referral_uses WHERE referrer_id = auth.uid() AND status = 'rewarded'
    ),
    'pending_referrals', (
      SELECT COUNT(*) FROM referral_uses WHERE referrer_id = auth.uid() AND status IN ('pending','confirmed')
    ),
    'total_credits', _total_credits,
    'credits_as_days', _total_credits,
    'referrals_this_month', (
      SELECT COUNT(*) FROM referral_uses
      WHERE referrer_id = auth.uid() AND created_at > now() - interval '30 days'
    )
  ) INTO _result;

  RETURN _result;
END;
$$;

-- Get recent referrals with basic referred user info
CREATE OR REPLACE FUNCTION get_my_referrals(lim INT DEFAULT 20) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _result JSONB;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'id', ru.id,
    'status', ru.status,
    'created_at', ru.created_at,
    'rewarded_at', ru.rewarded_at,
    'referred_username', p.username,
    'referred_display_name', p.display_name,
    'referred_avatar_url', p.avatar_url
  ) ORDER BY ru.created_at DESC)
  INTO _result
  FROM referral_uses ru
  JOIN profiles p ON p.id = ru.referred_id
  WHERE ru.referrer_id = auth.uid()
  LIMIT lim;

  RETURN COALESCE(_result, '[]'::jsonb);
END;
$$;
