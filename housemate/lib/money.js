/**
 * HouseMate Financial Precision Engine
 *
 * All monetary values are stored as INTEGER CENTS to avoid floating-point errors.
 * e.g.  $45.00 → 4500 cents
 *       $9.00  → 900 cents
 *       $3.00  → 300 cents
 *
 * Why cents?
 *   JavaScript floats: 0.1 + 0.2 = 0.30000000000000004 ❌
 *   Integer cents:     10 + 20  = 30 ✓
 */

/**
 * Parse a dollar amount (string or number) to integer cents.
 * @param {string|number} amount - e.g. "$45.00", 45, "45.00"
 * @returns {number} integer cents
 */
export function parseToCents(amount) {
  if (amount === null || amount === undefined || amount === '') return 0;
  const clean = String(amount).replace(/[^0-9.-]/g, '');
  if (clean === '' || clean === '-') return 0;
  return Math.round(parseFloat(clean) * 100);
}

/**
 * Format integer cents to a human-readable currency string.
 * @param {number} cents - integer cents
 * @param {string} currency - currency symbol prefix (default: '$')
 * @returns {string} e.g. "$45.00"
 */
export function formatCents(cents, currency = '$') {
  if (typeof cents !== 'number' || isNaN(cents)) return `${currency}0.00`;
  const abs = Math.abs(cents);
  const formatted = (abs / 100).toFixed(2);
  return cents < 0 ? `-${currency}${formatted}` : `${currency}${formatted}`;
}

/**
 * Format cents as a compact string for display (e.g. "$38.50").
 * @param {number} cents
 * @param {string} currency
 * @returns {string}
 */
export function formatMoney(cents, currency = '$') {
  return formatCents(cents, currency);
}

/**
 * Deterministic equal split of total_cents among memberIds.
 *
 * Algorithm:
 * 1. Sort member IDs alphabetically for reproducible order.
 * 2. Calculate base share = floor(total / count)
 * 3. Calculate remainder = total - (base * count)
 * 4. First `remainder` members get (base + 1) cent
 * 5. Sum of all shares = total_cents exactly
 *
 * Example: $100.00 (10000 cents) / 3 people
 *   base = 3333, remainder = 1
 *   Person A (first alphabetically): 3334 cents
 *   Person B: 3333 cents
 *   Person C: 3333 cents
 *   Total: 10000 ✓
 *
 * @param {number} totalCents - integer total amount in cents
 * @param {string[]} memberIds - array of user UUID strings
 * @returns {{ userId: string, shareCents: number }[]}
 */
export function splitMoney(totalCents, memberIds) {
  if (!memberIds || memberIds.length === 0) return [];
  if (totalCents <= 0) return memberIds.map(id => ({ userId: id, shareCents: 0 }));

  const sorted = [...memberIds].sort(); // Deterministic order
  const count = sorted.length;
  const baseShare = Math.floor(totalCents / count);
  let remainder = totalCents - baseShare * count;

  return sorted.map(userId => {
    let share = baseShare;
    if (remainder > 0) {
      share += 1;
      remainder -= 1;
    }
    return { userId, shareCents: share };
  });
}

/**
 * Calculate per-person bill share for display purposes.
 * This is a simple calculation — the authoritative split is stored in bill_payments.
 *
 * @param {number} totalCents - total bill amount in cents
 * @param {number} memberCount - number of active members
 * @returns {{ baseShare: number, remainder: number }} cents
 */
export function calculateBillShare(totalCents, memberCount) {
  if (memberCount <= 0) return { baseShare: totalCents, remainder: 0 };
  const baseShare = Math.floor(totalCents / memberCount);
  const remainder = totalCents - baseShare * memberCount;
  return { baseShare, remainder };
}

/**
 * Calculate Wi-Fi (quarterly) saving target per person per month.
 *
 * Example: $45.00 / 5 members / 3 months = $3.00/month
 *
 * @param {number} totalCents - total bill amount in cents
 * @param {number} memberCount - number of members sharing the bill
 * @param {number} months - number of months in the billing cycle (e.g. 3 for quarterly)
 * @returns {{
 *   totalCents: number,
 *   individualShareCents: number,
 *   monthlyTargetCents: number
 * }}
 */
export function calculateSavingTarget(totalCents, memberCount, months) {
  if (memberCount <= 0 || months <= 0) {
    return { totalCents, individualShareCents: totalCents, monthlyTargetCents: totalCents };
  }
  const individualShareCents = Math.round(totalCents / memberCount);
  const monthlyTargetCents = Math.round(individualShareCents / months);
  return { totalCents, individualShareCents, monthlyTargetCents };
}

/**
 * Get the number of months in a billing frequency.
 * @param {string} frequency - 'one_time' | 'monthly' | 'quarterly' | 'semi_annual' | 'yearly'
 * @returns {number}
 */
export function frequencyToMonths(frequency) {
  const map = {
    one_time:    1,
    monthly:     1,
    quarterly:   3,
    semi_annual: 6,
    yearly:      12,
  };
  return map[frequency] ?? 1;
}

/**
 * Get human-readable frequency label.
 * @param {string} frequency
 * @returns {string}
 */
export function frequencyLabel(frequency) {
  const labels = {
    one_time:    'One time',
    monthly:     'Monthly',
    quarterly:   'Every 3 months',
    semi_annual: 'Every 6 months',
    yearly:      'Yearly',
  };
  return labels[frequency] ?? frequency;
}

/**
 * Calculate the next due date from a given date and frequency.
 * @param {Date|string} fromDate - starting date
 * @param {string} frequency - billing frequency
 * @returns {Date}
 */
export function getNextDueDate(fromDate, frequency) {
  const date = new Date(fromDate);
  const months = frequencyToMonths(frequency);
  date.setMonth(date.getMonth() + months);
  return date;
}

/**
 * Format a Date object or ISO string as "Month Day" (e.g. "Sep 10").
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDateShort(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format a Date object or ISO string as "Month Day, Year" (e.g. "September 10, 2025").
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDateLong(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Get days until a future date from today.
 * @param {Date|string} dueDate
 * @returns {number} positive = future, 0 = today, negative = past
 */
export function daysUntil(dueDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - now) / (1000 * 60 * 60 * 24));
}

/**
 * Get current month in 'YYYY-MM' format.
 * @returns {string}
 */
export function currentMonthYear() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get the number of days remaining in the current month.
 * @returns {number}
 */
export function daysRemainingInMonth() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate();
}

/**
 * Category icons mapping for personal expenses.
 */
export const CATEGORY_ICONS = {
  Food:           '🍜',
  Transportation: '🚌',
  Shopping:       '🛍️',
  Entertainment:  '🎬',
  Education:      '📚',
  Bills:          '⚡',
  Health:         '🏥',
  Other:          '💡',
};

/**
 * All expense categories.
 */
export const EXPENSE_CATEGORIES = Object.keys(CATEGORY_ICONS);

/**
 * Bill category icons.
 */
export const BILL_ICONS = {
  rent:        'real_estate_agent',
  electricity: 'bolt',
  water:       'water_drop',
  wifi:        'wifi',
  gas:         'local_fire_department',
  internet:    'wifi',
  general:     'receipt_long',
  other:       'receipt',
};

/**
 * Get initials from a full name (max 2 chars).
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
