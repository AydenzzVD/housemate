-- ============================================================
-- Migration: 006_bill_start_date.sql
-- HouseMate — Custom Bill Start Date & Due Timing Support
-- ============================================================

-- Add start_date and due_timing to bills table if they do not exist
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS due_timing TEXT DEFAULT 'end_of_period'
    CHECK (due_timing IN ('start_of_period', 'end_of_period'));

-- Update existing bills to set start_date from created_at if null
UPDATE public.bills
SET start_date = created_at::DATE
WHERE start_date IS NULL;
