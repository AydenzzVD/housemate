/**
 * HouseMate Unified Data & State Manager
 *
 * Connects to Supabase when credentials exist, or provides an interactive
 * local state for testing the complete 5-roommate scenario.
 */

import { parseToCents, formatCents, splitMoney, calculateSavingTarget, currentMonthYear } from './money';

// Initial default state (5 roommates scenario)
export const INITIAL_DEMO_HOUSE = {
  id: 'house-harmony-1',
  name: 'Our House',
  currency: '$',
  join_code: 'OUR5X7',
  created_at: new Date().toISOString(),
};

export const INITIAL_DEMO_MEMBERS = [
  { id: 'usr-1', full_name: 'Devid',  email: 'devid@housemate.local',  role: 'admin',  avatar: 'D' },
  { id: 'usr-2', full_name: 'Dara',   email: 'dara@housemate.local',   role: 'member', avatar: 'Da' },
  { id: 'usr-3', full_name: 'Sok',    email: 'sok@housemate.local',    role: 'member', avatar: 'S' },
  { id: 'usr-4', full_name: 'Vannak', email: 'vannak@housemate.local', role: 'member', avatar: 'V' },
  { id: 'usr-5', full_name: 'Rith',   email: 'rith@housemate.local',   role: 'member', avatar: 'R' },
];

export const INITIAL_DEMO_BILLS = [
  {
    id: 'bill-rent',
    name: 'House Rent',
    total_amount_cents: 10000, // $100.00
    frequency: 'monthly',
    due_day_of_month: 1,
    category: 'rent',
    is_active: true,
  },
  {
    id: 'bill-elec',
    name: 'Electricity',
    total_amount_cents: 3250, // $32.50
    frequency: 'monthly',
    due_day_of_month: 5,
    category: 'electricity',
    is_active: true,
  },
  {
    id: 'bill-water',
    name: 'Water',
    total_amount_cents: 1500, // $15.00
    frequency: 'monthly',
    due_day_of_month: 10,
    category: 'water',
    is_active: true,
  },
  {
    id: 'bill-wifi',
    name: 'Wi-Fi',
    total_amount_cents: 4500, // $45.00
    frequency: 'quarterly', // Every 3 months
    due_day_of_month: 10,
    category: 'wifi',
    is_active: true,
  },
];

export const INITIAL_DEMO_PAYMENTS = [
  { id: 'pay-1', member_id: 'usr-1', name: 'Devid',  amount_cents: 3850, status: 'paid',    paid_at: '2026-08-20T10:00:00Z' },
  { id: 'pay-2', member_id: 'usr-2', name: 'Dara',   amount_cents: 3850, status: 'paid',    paid_at: '2026-08-21T11:30:00Z' },
  { id: 'pay-3', member_id: 'usr-3', name: 'Sok',    amount_cents: 3850, status: 'pending', paid_at: null },
  { id: 'pay-4', member_id: 'usr-4', name: 'Vannak', amount_cents: 3850, status: 'paid',    paid_at: '2026-08-22T14:15:00Z' },
  { id: 'pay-5', member_id: 'usr-5', name: 'Rith',   amount_cents: 3850, status: 'pending', paid_at: null },
];

export const INITIAL_DEMO_EXPENSES = [
  { id: 'exp-1', user_id: 'usr-1', title: 'Lunch',   amount_cents: 350, category: 'Food',           date: '2026-08-25', note: 'Pho soup' },
  { id: 'exp-2', user_id: 'usr-1', title: 'Grab Taxi', amount_cents: 450, category: 'Transportation', date: '2026-08-25', note: 'Ride home' },
  { id: 'exp-3', user_id: 'usr-1', title: 'Coffee',  amount_cents: 200, category: 'Food',           date: '2026-08-24', note: 'Iced latte' },
  { id: 'exp-4', user_id: 'usr-1', title: 'Groceries', amount_cents: 8500, category: 'Food',        date: '2026-08-20', note: 'Weekly market' },
  { id: 'exp-5', user_id: 'usr-1', title: 'Cinema',  amount_cents: 1200, category: 'Entertainment', date: '2026-08-18', note: 'Movie ticket' },
];

export const INITIAL_DEMO_SAVINGS = [
  { id: 'sav-1', bill_id: 'bill-wifi', user_id: 'usr-1', amount_cents: 300, saved_date: '2026-07-10', note: 'Month 1 saving' },
  { id: 'sav-2', bill_id: 'bill-wifi', user_id: 'usr-1', amount_cents: 300, saved_date: '2026-08-10', note: 'Month 2 saving' },
];

// Helper to access / update localStorage in browser
const STORAGE_KEY = 'housemate_app_data_v1';

export function getLocalStore() {
  if (typeof window === 'undefined') {
    return {
      house: INITIAL_DEMO_HOUSE,
      members: INITIAL_DEMO_MEMBERS,
      bills: INITIAL_DEMO_BILLS,
      payments: INITIAL_DEMO_PAYMENTS,
      expenses: INITIAL_DEMO_EXPENSES,
      savings: INITIAL_DEMO_SAVINGS,
      currentUser: INITIAL_DEMO_MEMBERS[0], // Devid (Admin)
      budget_cents: 50000, // $500.00
    };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error reading localStorage', e);
  }

  const initial = {
    house: INITIAL_DEMO_HOUSE,
    members: INITIAL_DEMO_MEMBERS,
    bills: INITIAL_DEMO_BILLS,
    payments: INITIAL_DEMO_PAYMENTS,
    expenses: INITIAL_DEMO_EXPENSES,
    savings: INITIAL_DEMO_SAVINGS,
    currentUser: INITIAL_DEMO_MEMBERS[0],
    budget_cents: 50000,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  } catch (e) {}

  return initial;
}

export function saveLocalStore(data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to localStorage', e);
  }
}
