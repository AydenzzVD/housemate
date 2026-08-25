-- HouseMate Atomic RPC Functions
-- Run AFTER 001_schema.sql and 002_rls.sql

-- ============================================================
-- RPC: create_house_with_admin
-- Creates house and admin membership in a single atomic transaction.
-- The browser never controls the role or house_id.
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_house_with_admin(
  p_name     TEXT,
  p_currency TEXT DEFAULT '$'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_join_code  VARCHAR(6);
  v_house_id   UUID;
  v_exists     BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'House name cannot be empty';
  END IF;

  -- Generate a unique 6-character uppercase alphanumeric join code
  LOOP
    SELECT UPPER(SUBSTRING(ENCODE(GEN_RANDOM_BYTES(4), 'hex') FROM 1 FOR 6))
    INTO v_join_code;
    
    SELECT EXISTS (
      SELECT 1 FROM public.houses WHERE join_code = v_join_code
    ) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;

  -- Atomically create house
  INSERT INTO public.houses (name, currency, join_code, created_by)
  VALUES (TRIM(p_name), COALESCE(NULLIF(TRIM(p_currency), ''), '$'), v_join_code, v_user_id)
  RETURNING id INTO v_house_id;

  -- Atomically assign creator as admin
  INSERT INTO public.house_members (house_id, user_id, role)
  VALUES (v_house_id, v_user_id, 'admin');

  RETURN jsonb_build_object(
    'house_id',  v_house_id,
    'join_code', v_join_code,
    'name',      TRIM(p_name),
    'role',      'admin'
  );
END;
$$;

-- ============================================================
-- RPC: join_house_by_code
-- Validates join code server-side. Browser only provides the code.
-- Server determines house_id and enforces 'member' role.
-- ============================================================
CREATE OR REPLACE FUNCTION public.join_house_by_code(
  p_join_code VARCHAR(6)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_clean_code    VARCHAR(6);
  v_house_id      UUID;
  v_house_name    TEXT;
  v_already_member BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Normalize: uppercase + trim
  v_clean_code := UPPER(TRIM(p_join_code));

  IF v_clean_code IS NULL OR LENGTH(v_clean_code) <> 6 THEN
    RAISE EXCEPTION 'Invalid house code format';
  END IF;

  -- Find the house
  SELECT id, name INTO v_house_id, v_house_name
  FROM public.houses
  WHERE join_code = v_clean_code;

  IF v_house_id IS NULL THEN
    RAISE EXCEPTION 'House code not found';
  END IF;

  -- Check if already a member
  SELECT EXISTS (
    SELECT 1 FROM public.house_members
    WHERE house_id = v_house_id AND user_id = v_user_id
  ) INTO v_already_member;

  IF v_already_member THEN
    RAISE EXCEPTION 'You are already a member of this house';
  END IF;

  -- Add as 'member' (never 'admin' — admin is set only on creation)
  INSERT INTO public.house_members (house_id, user_id, role)
  VALUES (v_house_id, v_user_id, 'member');

  RETURN jsonb_build_object(
    'house_id',  v_house_id,
    'name',      v_house_name,
    'role',      'member'
  );
END;
$$;

-- ============================================================
-- RPC: mark_my_payment_status
-- Only allows the authenticated user to update THEIR OWN payment.
-- Prevents tampering with share_amount_cents, user_id, or bill_cycle_id.
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_my_payment_status(
  p_payment_id UUID,
  p_status     TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_status NOT IN ('paid', 'pending') THEN
    RAISE EXCEPTION 'Invalid status value. Must be: paid or pending';
  END IF;

  -- Strictly update ONLY status and paid_at for the current user's payment
  UPDATE public.bill_payments
  SET
    status  = p_status,
    paid_at = CASE WHEN p_status = 'paid' THEN NOW() ELSE NULL END
  WHERE id      = p_payment_id
    AND user_id = v_user_id;  -- THE SECURITY GUARANTEE

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found or you do not own this payment';
  END IF;
END;
$$;

-- ============================================================
-- RPC: create_bill_cycle
-- Creates a bill_cycle and frozen bill_payments for all current active members.
-- Called by admin. share_amount_cents is immutably set at creation time.
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_bill_cycle(
  p_bill_id      UUID,
  p_period_start DATE,
  p_period_end   DATE,
  p_due_date     DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id           UUID := auth.uid();
  v_house_id          UUID;
  v_total_cents       INTEGER;
  v_cycle_id          UUID;
  v_member            RECORD;
  v_member_ids        UUID[];
  v_member_count      INTEGER;
  v_base_share        INTEGER;
  v_remainder         INTEGER;
  v_share             INTEGER;
  v_idx               INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller is admin of the bill's house
  SELECT b.house_id, b.total_amount_cents
  INTO v_house_id, v_total_cents
  FROM public.bills b
  WHERE b.id = p_bill_id;

  IF v_house_id IS NULL THEN
    RAISE EXCEPTION 'Bill not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.house_members
    WHERE house_id = v_house_id AND user_id = v_user_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can create bill cycles';
  END IF;

  -- Create the cycle record
  INSERT INTO public.bill_cycles (bill_id, house_id, period_start, period_end, due_date, total_amount_cents)
  VALUES (p_bill_id, v_house_id, p_period_start, p_period_end, p_due_date, v_total_cents)
  RETURNING id INTO v_cycle_id;

  -- Get sorted member IDs (deterministic order for remainder allocation)
  SELECT ARRAY_AGG(user_id ORDER BY user_id::TEXT)
  INTO v_member_ids
  FROM public.house_members
  WHERE house_id = v_house_id;

  v_member_count := ARRAY_LENGTH(v_member_ids, 1);

  IF v_member_count IS NULL OR v_member_count = 0 THEN
    RAISE EXCEPTION 'No members found in house';
  END IF;

  -- Deterministic equal split with integer cent precision
  v_base_share := v_total_cents / v_member_count;
  v_remainder  := v_total_cents - (v_base_share * v_member_count);

  -- Create a payment record for each member with frozen share
  FOR v_idx IN 1..v_member_count LOOP
    v_share := v_base_share;
    IF v_idx <= v_remainder THEN
      v_share := v_share + 1;  -- Distribute remainder 1 cent at a time
    END IF;

    INSERT INTO public.bill_payments (bill_cycle_id, user_id, share_amount_cents)
    VALUES (v_cycle_id, v_member_ids[v_idx], v_share);
  END LOOP;

  RETURN jsonb_build_object(
    'cycle_id',       v_cycle_id,
    'member_count',   v_member_count,
    'total_cents',    v_total_cents,
    'base_share',     v_base_share
  );
END;
$$;
