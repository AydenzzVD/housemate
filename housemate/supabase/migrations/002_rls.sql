-- HouseMate Row Level Security Policies
-- Run AFTER 001_schema.sql

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_cycles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_savings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets       ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES POLICIES
-- ============================================================
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (TRUE);  -- All authenticated users can read profiles (needed for member listings)

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- HOUSES POLICIES
-- ============================================================
CREATE POLICY "houses_select_members_only"
  ON public.houses FOR SELECT
  TO authenticated
  USING (public.is_house_member(id, auth.uid()));

-- Insert handled by the create_house_with_admin RPC (SECURITY DEFINER)
-- No direct insert policy needed for normal users

-- ============================================================
-- HOUSE_MEMBERS POLICIES
-- ============================================================
CREATE POLICY "house_members_select_co_members"
  ON public.house_members FOR SELECT
  TO authenticated
  USING (public.is_house_member(house_id, auth.uid()));

-- Join is handled by join_house_by_code RPC (SECURITY DEFINER)
-- No direct insert policy needed for normal users

-- ============================================================
-- BILLS POLICIES
-- ============================================================
CREATE POLICY "bills_select_house_members"
  ON public.bills FOR SELECT
  TO authenticated
  USING (public.is_house_member(house_id, auth.uid()));

-- Bill creation handled via API route that verifies admin role server-side
CREATE POLICY "bills_insert_admin_only"
  ON public.bills FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.house_members
      WHERE house_id = bills.house_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "bills_update_admin_only"
  ON public.bills FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.house_members
      WHERE house_id = bills.house_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "bills_delete_admin_only"
  ON public.bills FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.house_members
      WHERE house_id = bills.house_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- ============================================================
-- BILL_CYCLES POLICIES
-- ============================================================
CREATE POLICY "bill_cycles_select_house_members"
  ON public.bill_cycles FOR SELECT
  TO authenticated
  USING (public.is_house_member(house_id, auth.uid()));

CREATE POLICY "bill_cycles_insert_admin_only"
  ON public.bill_cycles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.house_members
      WHERE house_id = bill_cycles.house_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- ============================================================
-- BILL_PAYMENTS POLICIES
-- share_amount_cents is FROZEN - users can only update status
-- ============================================================
CREATE POLICY "bill_payments_select_house_members"
  ON public.bill_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bill_cycles bc
      WHERE bc.id = bill_payments.bill_cycle_id
        AND public.is_house_member(bc.house_id, auth.uid())
    )
  );

-- Users can ONLY update their OWN payment's status field via mark_my_payment_status RPC
-- Direct UPDATE is blocked; use the RPC which validates user_id = auth.uid()

-- ============================================================
-- BILL_SAVINGS POLICIES
-- ============================================================
CREATE POLICY "bill_savings_select_house_members"
  ON public.bill_savings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_savings.bill_id
        AND public.is_house_member(b.house_id, auth.uid())
    )
  );

CREATE POLICY "bill_savings_manage_own"
  ON public.bill_savings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- EXPENSES POLICIES — STRICTLY PRIVATE
-- ============================================================
CREATE POLICY "expenses_private_self_only"
  ON public.expenses FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- BUDGETS POLICIES — STRICTLY PRIVATE
-- ============================================================
CREATE POLICY "budgets_private_self_only"
  ON public.budgets FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
