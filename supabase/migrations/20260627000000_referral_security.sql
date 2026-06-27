-- Referral security: annual cap + fraud detection
-- Adds guards against referral farming without breaking the existing apply_referral_code RPC.

-- 1. Security audit log
CREATE TABLE IF NOT EXISTS referral_security_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,   -- 'cap_exceeded' | 'new_account' | 'self_referral'
  referrer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE referral_security_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read referral_security_log"
  ON referral_security_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin','moderator')
    )
  );

-- 2. Function: can this referrer earn another credit right now?
CREATE OR REPLACE FUNCTION check_referral_allowed(
  p_referrer_id uuid,
  p_referred_id uuid
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_annual_count int;
  v_referred_age interval;
BEGIN
  -- Self-referral guard
  IF p_referrer_id = p_referred_id THEN
    INSERT INTO referral_security_log(event_type, referrer_id, referred_id, metadata)
    VALUES ('self_referral', p_referrer_id, p_referred_id, '{}');
    RETURN false;
  END IF;

  -- Annual credit cap: max 50 rewarded referrals per rolling year
  SELECT COUNT(*) INTO v_annual_count
  FROM referrals
  WHERE referrer_id = p_referrer_id
    AND status = 'rewarded'
    AND rewarded_at > now() - interval '365 days';

  IF v_annual_count >= 50 THEN
    INSERT INTO referral_security_log(event_type, referrer_id, referred_id, metadata)
    VALUES ('cap_exceeded', p_referrer_id, p_referred_id,
            jsonb_build_object('annual_count', v_annual_count));
    RETURN false;
  END IF;

  -- New account guard: referred user must be at least 1 hour old
  SELECT (now() - created_at) INTO v_referred_age
  FROM auth.users
  WHERE id = p_referred_id;

  IF v_referred_age IS NOT NULL AND v_referred_age < interval '1 hour' THEN
    INSERT INTO referral_security_log(event_type, referrer_id, referred_id, metadata)
    VALUES ('new_account', p_referrer_id, p_referred_id,
            jsonb_build_object('age_seconds', EXTRACT(EPOCH FROM v_referred_age)));
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- 3. Add performance indexes for fraud detection queries
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_rewarded_at
  ON referrals(referrer_id, rewarded_at)
  WHERE status = 'rewarded';

CREATE INDEX IF NOT EXISTS idx_referrals_referred_status
  ON referrals(referred_user_id, status);
