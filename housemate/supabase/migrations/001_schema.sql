-- HouseMate Database Schema Migration
-- Run this in Supabase SQL Editor

-- ============================================================
-- HELPER FUNCTION: Check House Membership (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_house_member(p_house_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.house_members
    WHERE house_id = p_house_id AND user_id = p_user_id
  );
END;
$$;

-- ============================================================
-- TABLE: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  avatar_url  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: houses
-- ============================================================
CREATE TABLE IF NOT EXISTS public.houses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  currency    TEXT NOT NULL DEFAULT '$',
  join_code   VARCHAR(6) NOT NULL,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT  houses_join_code_unique UNIQUE (join_code)
);

-- ============================================================
-- TABLE: house_members
-- ============================================================
CREATE TABLE IF NOT EXISTS public.house_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id    UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member'
              CHECK (role IN ('admin', 'member')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT  house_members_unique UNIQUE (house_id, user_id)
);

-- ============================================================
-- TABLE: bills
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bills (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id             UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  total_amount_cents   INTEGER NOT NULL CHECK (total_amount_cents > 0),
  frequency            TEXT NOT NULL DEFAULT 'monthly'
                       CHECK (frequency IN ('one_time', 'monthly', 'quarterly', 'semi_annual', 'yearly')),
  due_day_of_month     INTEGER NOT NULL DEFAULT 1 CHECK (due_day_of_month BETWEEN 1 AND 28),
  category             TEXT NOT NULL DEFAULT 'general',
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_by           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: bill_cycles (Immutable billing period containers)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bill_cycles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id              UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  house_id             UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  period_start         DATE NOT NULL,
  period_end           DATE NOT NULL,
  due_date             DATE NOT NULL,
  total_amount_cents   INTEGER NOT NULL CHECK (total_amount_cents > 0),
  status               TEXT NOT NULL DEFAULT 'open'
                       CHECK (status IN ('open', 'fully_paid', 'overdue')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: bill_payments (Per-member, per-cycle payment records)
-- share_amount_cents is FROZEN at cycle creation time
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bill_payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_cycle_id        UUID NOT NULL REFERENCES public.bill_cycles(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  share_amount_cents   INTEGER NOT NULL CHECK (share_amount_cents >= 0),
  status               TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'paid')),
  paid_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bill_payments_unique UNIQUE (bill_cycle_id, user_id)
);

-- ============================================================
-- TABLE: bill_savings (Actual recorded savings for recurring bills)
-- Expected saving target is CALCULATED, not stored.
-- This table stores ACTUAL user-recorded deposits only.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bill_savings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id     UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  saved_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: expenses (PRIVATE personal expenses)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  category     TEXT NOT NULL DEFAULT 'Food',
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: budgets (PRIVATE personal monthly budgets)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.budgets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month_year   VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM'
  budget_cents INTEGER NOT NULL CHECK (budget_cents >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT budgets_unique UNIQUE (user_id, month_year)
);

-- ============================================================
-- INDEXES (for query performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_house_members_house_id   ON public.house_members (house_id);
CREATE INDEX IF NOT EXISTS idx_house_members_user_id    ON public.house_members (user_id);
CREATE INDEX IF NOT EXISTS idx_bills_house_id           ON public.bills (house_id);
CREATE INDEX IF NOT EXISTS idx_bill_cycles_bill_id      ON public.bill_cycles (bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_cycles_house_id     ON public.bill_cycles (house_id);
CREATE INDEX IF NOT EXISTS idx_bill_cycles_due_date     ON public.bill_cycles (due_date);
CREATE INDEX IF NOT EXISTS idx_bill_payments_cycle_id   ON public.bill_payments (bill_cycle_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_user_id    ON public.bill_payments (user_id);
CREATE INDEX IF NOT EXISTS idx_bill_savings_bill_id     ON public.bill_savings (bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_savings_user_id     ON public.bill_savings (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id         ON public.expenses (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date            ON public.expenses (date);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id          ON public.budgets (user_id);

-- ============================================================
-- TRIGGER: Auto-create profile on new user signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
