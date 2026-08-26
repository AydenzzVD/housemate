-- ============================================================
-- Migration: 005_financial_refinement.sql
-- HouseMate — Real-World Billing Logic Refinement
--
-- Safety: All changes are idempotent (IF NOT EXISTS / OR REPLACE).
-- Run AFTER 001-004 migrations.
-- ============================================================

-- ============================================================
-- 1. Expand bill_cycles.status to include all valid states.
--    Existing CHECK constraint must be replaced.
-- ============================================================
ALTER TABLE public.bill_cycles
  DROP CONSTRAINT IF EXISTS bill_cycles_status_check;

ALTER TABLE public.bill_cycles
  ADD CONSTRAINT bill_cycles_status_check
  CHECK (status IN ('upcoming', 'open', 'overdue', 'fully_paid', 'cancelled'));

-- ============================================================
-- 2. UNIQUE constraint on (bill_id, period_start).
--    Prevents duplicate cycles. ON CONFLICT DO NOTHING is safe.
-- ============================================================
ALTER TABLE public.bill_cycles
  DROP CONSTRAINT IF EXISTS bill_cycles_bill_period_unique;

ALTER TABLE public.bill_cycles
  ADD CONSTRAINT bill_cycles_bill_period_unique UNIQUE (bill_id, period_start);

-- ============================================================
-- 3. Update mark_my_payment_status RPC.
--    After updating the payment, checks if ALL payments in the
--    cycle are now 'paid'. If so, marks the cycle as 'fully_paid'.
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
  v_user_id       UUID := auth.uid();
  v_cycle_id      UUID;
  v_all_paid      BOOLEAN;
  v_current_cycle_status TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_status NOT IN ('paid', 'pending') THEN
    RAISE EXCEPTION 'Invalid status value. Must be: paid or pending';
  END IF;

  -- Update ONLY status and paid_at for the current user's payment
  UPDATE public.bill_payments
  SET
    status  = p_status,
    paid_at = CASE WHEN p_status = 'paid' THEN NOW() ELSE NULL END
  WHERE id      = p_payment_id
    AND user_id = v_user_id  -- THE SECURITY GUARANTEE
  RETURNING bill_cycle_id INTO v_cycle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found or you do not own this payment';
  END IF;

  -- Get current cycle status
  SELECT status INTO v_current_cycle_status
  FROM public.bill_cycles
  WHERE id = v_cycle_id;

  -- Only auto-update if cycle is currently open or overdue (not cancelled/upcoming)
  IF v_current_cycle_status IN ('open', 'overdue') THEN
    -- Check if ALL payments in this cycle are now 'paid'
    SELECT NOT EXISTS (
      SELECT 1 FROM public.bill_payments
      WHERE bill_cycle_id = v_cycle_id
        AND status = 'pending'
    ) INTO v_all_paid;

    IF v_all_paid AND p_status = 'paid' THEN
      UPDATE public.bill_cycles
      SET status = 'fully_paid'
      WHERE id = v_cycle_id;
    ELSIF p_status = 'pending' AND v_current_cycle_status = 'fully_paid' THEN
      -- If someone un-pays, revert cycle status to open/overdue based on due date
      UPDATE public.bill_cycles
      SET status = CASE
        WHEN due_date < CURRENT_DATE THEN 'overdue'
        ELSE 'open'
      END
      WHERE id = v_cycle_id;
    END IF;
  END IF;
END;
$$;

-- ============================================================
-- 4. RPC: ensure_house_bill_cycles
--    Idempotent cycle generation for all active bills in a house.
--    Generates cycles for the current and next period.
--    Uses ON CONFLICT DO NOTHING so running multiple times is safe.
--    Called server-side on app load and via cron.
-- ============================================================
CREATE OR REPLACE FUNCTION public.ensure_house_bill_cycles(
  p_house_id    UUID,
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bill          RECORD;
  v_member_ids    UUID[];
  v_member_count  INTEGER;
  v_base_share    INTEGER;
  v_remainder     INTEGER;
  v_cycle_id      UUID;
  v_period_start  DATE;
  v_period_end    DATE;
  v_due_date      DATE;
  v_cycles_created INTEGER := 0;
  v_cycle_months  INTEGER;
  v_start_year    INTEGER;
  v_start_month   INTEGER;
  v_end_year      INTEGER;
  v_end_month     INTEGER;
  v_today_day     INTEGER;
  v_due_day       INTEGER;
  v_target_month  INTEGER;
  v_target_year   INTEGER;
  v_idx           INTEGER;
  v_share         INTEGER;
  v_existing      UUID;
BEGIN
  -- Get current active members for this house
  SELECT ARRAY_AGG(user_id ORDER BY user_id::TEXT)
  INTO v_member_ids
  FROM public.house_members
  WHERE house_id = p_house_id;

  v_member_count := ARRAY_LENGTH(v_member_ids, 1);
  IF v_member_count IS NULL OR v_member_count = 0 THEN
    RETURN jsonb_build_object('cycles_created', 0, 'reason', 'no_members');
  END IF;

  v_today_day   := EXTRACT(DAY FROM p_target_date)::INTEGER;
  v_target_year := EXTRACT(YEAR FROM p_target_date)::INTEGER;
  v_target_month:= EXTRACT(MONTH FROM p_target_date)::INTEGER;

  -- Loop over all active bills in this house
  FOR v_bill IN
    SELECT id, total_amount_cents, frequency, due_day_of_month
    FROM public.bills
    WHERE house_id = p_house_id
      AND is_active = TRUE
  LOOP
    v_cycle_months := CASE v_bill.frequency
      WHEN 'monthly'     THEN 1
      WHEN 'quarterly'   THEN 3
      WHEN 'semi_annual' THEN 6
      WHEN 'yearly'      THEN 12
      ELSE 1
    END;

    v_due_day := v_bill.due_day_of_month;

    -- Determine the start month for the "current" period
    -- If today >= due day, the current period already passed its due; look at current month start
    -- We generate cycles for the CURRENT period and NEXT period ahead.

    -- Current period start = this month's 1st (for monthly bills)
    -- For quarterly/etc, find which period we are currently in.
    -- Simple approach: generate for target month and target month + cycle_months
    FOR v_offset IN 0..1 LOOP
      v_start_month := v_target_month + (v_offset * v_cycle_months);
      v_start_year  := v_target_year;
      WHILE v_start_month > 12 LOOP
        v_start_month := v_start_month - 12;
        v_start_year  := v_start_year + 1;
      END LOOP;

      -- Period start = 1st of the start month
      v_period_start := MAKE_DATE(v_start_year, v_start_month, 1);

      -- End month = start + cycle_months - 1
      v_end_month := v_start_month + v_cycle_months - 1;
      v_end_year  := v_start_year;
      WHILE v_end_month > 12 LOOP
        v_end_month := v_end_month - 12;
        v_end_year  := v_end_year + 1;
      END LOOP;

      -- Period end = last day of end month
      v_period_end := (MAKE_DATE(v_end_year, v_end_month, 1) + INTERVAL '1 month - 1 day')::DATE;

      -- Due date = due day of end month (clamped to last day)
      v_due_date := MAKE_DATE(
        v_end_year,
        v_end_month,
        LEAST(v_due_day, EXTRACT(DAY FROM v_period_end)::INTEGER)
      );

      -- Check if cycle already exists for this bill+period (idempotency)
      SELECT id INTO v_existing
      FROM public.bill_cycles
      WHERE bill_id = v_bill.id
        AND period_start = v_period_start;

      IF v_existing IS NULL THEN
        -- Create the cycle
        INSERT INTO public.bill_cycles (
          bill_id, house_id, period_start, period_end, due_date,
          total_amount_cents, status
        )
        VALUES (
          v_bill.id, p_house_id, v_period_start, v_period_end, v_due_date,
          v_bill.total_amount_cents,
          CASE
            WHEN v_due_date < p_target_date THEN 'overdue'
            WHEN v_due_date = p_target_date THEN 'open'
            ELSE 'open'
          END
        )
        RETURNING id INTO v_cycle_id;

        -- Create frozen payment records for all current members
        v_base_share := v_bill.total_amount_cents / v_member_count;
        v_remainder  := v_bill.total_amount_cents - (v_base_share * v_member_count);

        FOR v_idx IN 1..v_member_count LOOP
          v_share := v_base_share;
          IF v_idx <= v_remainder THEN
            v_share := v_share + 1;
          END IF;

          INSERT INTO public.bill_payments (bill_cycle_id, user_id, share_amount_cents)
          VALUES (v_cycle_id, v_member_ids[v_idx], v_share)
          ON CONFLICT DO NOTHING;
        END LOOP;

        v_cycles_created := v_cycles_created + 1;
      END IF;
    END LOOP;
  END LOOP;

  -- Refresh overdue status on existing open cycles
  UPDATE public.bill_cycles
  SET status = 'overdue'
  WHERE house_id = p_house_id
    AND status = 'open'
    AND due_date < p_target_date;

  RETURN jsonb_build_object(
    'cycles_created', v_cycles_created,
    'house_id', p_house_id
  );
END;
$$;

-- ============================================================
-- 5. RPC: update_bill_definition
--    Safely updates a bill's name/amount/category/frequency/due_day.
--    Does NOT touch historical bill_cycles or bill_payments.
--    Updates the bill definition only; future cycle generation picks up the change.
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_bill_definition(
  p_bill_id          UUID,
  p_name             TEXT,
  p_total_amount_cents INTEGER,
  p_frequency        TEXT,
  p_due_day_of_month INTEGER,
  p_category         TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  UUID := auth.uid();
  v_house_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT house_id INTO v_house_id
  FROM public.bills
  WHERE id = p_bill_id;

  IF v_house_id IS NULL THEN
    RAISE EXCEPTION 'Bill not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.house_members
    WHERE house_id = v_house_id
      AND user_id = v_user_id
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can update bill definitions';
  END IF;

  UPDATE public.bills
  SET
    name               = TRIM(p_name),
    total_amount_cents = p_total_amount_cents,
    frequency          = p_frequency,
    due_day_of_month   = p_due_day_of_month,
    category           = p_category
  WHERE id = p_bill_id;
END;
$$;

-- ============================================================
-- 6. Grant execute permissions on new RPCs to authenticated users
-- ============================================================
GRANT EXECUTE ON FUNCTION public.ensure_house_bill_cycles(UUID, DATE)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_bill_definition(UUID, TEXT, INTEGER, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_my_payment_status(UUID, TEXT) TO authenticated;
