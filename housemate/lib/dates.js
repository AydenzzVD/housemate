/**
 * lib/dates.js
 * Centralized date and timezone utilities for HouseMate.
 *
 * HOUSE TIMEZONE: Asia/Phnom_Penh (UTC+7, no DST)
 *
 * CRITICAL: All financial date logic (due dates, overdue detection, monthly
 * boundaries, cycle generation) MUST use these functions — never raw `new Date()`.
 */

const HOUSE_TIMEZONE = 'Asia/Phnom_Penh';

/**
 * Get today's date string (YYYY-MM-DD) in the house timezone.
 * @returns {string} e.g. "2026-08-25"
 */
export function getTodayInHouseTimezone() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: HOUSE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Get current month string (YYYY-MM) in the house timezone.
 * @returns {string} e.g. "2026-08"
 */
export function getCurrentMonth() {
  const today = getTodayInHouseTimezone();
  return today.slice(0, 7);
}

/**
 * Get current year and month as integers in the house timezone.
 * @returns {{ year: number, month: number }} month is 1-indexed
 */
export function getCurrentYearMonth() {
  const today = getTodayInHouseTimezone(); // "YYYY-MM-DD"
  const [y, m] = today.split('-');
  return { year: parseInt(y, 10), month: parseInt(m, 10) };
}

/**
 * Get today's day of month (integer) in the house timezone.
 * @returns {number} e.g. 25
 */
export function getTodayDayOfMonth() {
  const today = getTodayInHouseTimezone();
  return parseInt(today.split('-')[2], 10);
}

/**
 * Calculate the exact bill cycle dates from an explicit user-selected Start Date.
 *
 * Example 1 (Rent):
 *   startDateStr = "2026-08-17", frequency = "monthly", dueTiming = "start_of_period"
 *   → periodStart = "2026-08-17", periodEnd = "2026-09-16", dueDate = "2026-08-17"
 *
 * Example 2 (Wi-Fi):
 *   startDateStr = "2026-08-26", frequency = "quarterly", dueTiming = "end_of_period"
 *   → periodStart = "2026-08-26", periodEnd = "2026-11-25", dueDate = "2026-11-26"
 *
 * @param {string} startDateStr - "YYYY-MM-DD"
 * @param {string} frequency - 'monthly' | 'quarterly' | 'semi_annual' | 'yearly' | 'one_time'
 * @param {'start_of_period'|'end_of_period'} [dueTiming='end_of_period']
 * @returns {{ periodStart: string, periodEnd: string, dueDate: string }}
 */
export function calculateCycleFromStartDate(startDateStr, frequency, dueTiming = 'end_of_period') {
  const [y, m, d] = startDateStr.split('-').map(Number);
  const cycleMonths = frequencyToMonths(frequency);

  const periodStart = startDateStr;

  // Calculate next cycle start date (start + cycleMonths)
  let nextMonth = m + cycleMonths;
  let nextYear = y;
  while (nextMonth > 12) {
    nextMonth -= 12;
    nextYear += 1;
  }

  // Handle day overflow (e.g. Feb 31 -> Feb 28)
  const maxDayNextMonth = new Date(nextYear, nextMonth, 0).getDate();
  const safeDay = Math.min(d, maxDayNextMonth);
  const nextCycleStart = toISODate(nextYear, nextMonth, safeDay);

  // Period end is 1 day before the next cycle start
  const endObj = new Date(nextYear, nextMonth - 1, safeDay);
  endObj.setDate(endObj.getDate() - 1);
  const periodEnd = toISODate(endObj.getFullYear(), endObj.getMonth() + 1, endObj.getDate());

  // Due date calculation
  const dueDate = dueTiming === 'start_of_period' ? periodStart : nextCycleStart;

  return { periodStart, periodEnd, dueDate };
}

/**
 * Calculate the first bill cycle dates for a newly-created bill.
 * Retained for backwards compatibility if no start date is supplied.
 *
 * @param {number} dueDayOfMonth - 1-28
 * @param {string} frequency - 'monthly' | 'quarterly' | 'semi_annual' | 'yearly' | 'one_time'
 * @returns {{ periodStart: string, periodEnd: string, dueDate: string }}
 */
export function calculateFirstCycleDate(dueDayOfMonth, frequency) {
  const today = getTodayInHouseTimezone();
  return calculateCycleFromStartDate(today, frequency, 'end_of_period');
}

/**
 * Calculate the next bill cycle dates after a given period start.
 *
 * @param {string} lastPeriodStart - ISO date string of the last cycle's period_start
 * @param {string} frequency
 * @param {'start_of_period'|'end_of_period'} [dueTiming='end_of_period']
 * @returns {{ periodStart: string, periodEnd: string, dueDate: string }}
 */
export function calculateNextCycleDate(lastPeriodStart, frequency, dueTiming = 'end_of_period') {
  const [y, m, d] = lastPeriodStart.split('-').map(Number);
  const cycleMonths = frequencyToMonths(frequency);

  let nextMonth = m + cycleMonths;
  let nextYear = y;
  while (nextMonth > 12) {
    nextMonth -= 12;
    nextYear += 1;
  }
  const maxDay = new Date(nextYear, nextMonth, 0).getDate();
  const nextStart = toISODate(nextYear, nextMonth, Math.min(d, maxDay));

  return calculateCycleFromStartDate(nextStart, frequency, dueTiming);
}

/**
 * Format year/month/day to "YYYY-MM-DD".
 * @param {number} year
 * @param {number} month - 1-indexed
 * @param {number} day
 * @returns {string}
 */
function toISODate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Get number of months in a billing frequency.
 * @param {string} frequency
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
 * Calculate days between two YYYY-MM-DD date strings.
 * Positive = future, 0 = same day, negative = past.
 * @param {string} fromDate
 * @param {string} toDate
 * @returns {number}
 */
export function daysBetween(fromDate, toDate) {
  const from = new Date(fromDate + 'T00:00:00Z');
  const to = new Date(toDate + 'T00:00:00Z');
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

/**
 * Get days until a due date from today (in house timezone).
 * Positive = future, 0 = today, negative = overdue.
 * @param {string} dueDateStr - "YYYY-MM-DD"
 * @returns {number}
 */
export function daysUntilDue(dueDateStr) {
  const today = getTodayInHouseTimezone();
  return daysBetween(today, dueDateStr);
}

/**
 * Get a localized deadline status string for a bill cycle.
 *
 * @param {string} dueDateStr - "YYYY-MM-DD"
 * @param {boolean} isPaid
 * @param {Function} t - translation function from useLanguage
 * @returns {{ label: string, type: 'paid'|'today'|'upcoming'|'overdue' }}
 */
export function getDeadlineStatus(dueDateStr, isPaid, t) {
  if (isPaid) {
    return { label: t ? t('status.paid') : 'Paid', type: 'paid' };
  }

  const days = daysUntilDue(dueDateStr);

  if (days === 0) {
    return { label: t ? t('deadline.due_today') : 'Due today', type: 'today' };
  }
  if (days > 0) {
    return {
      label: t ? t('deadline.due_in_days', { days }) : `Due in ${days} days`,
      type: 'upcoming',
    };
  }
  // Overdue
  const overdueDays = Math.abs(days);
  return {
    label: t ? t('deadline.overdue_days', { days: overdueDays }) : `${overdueDays} days overdue`,
    type: 'overdue',
  };
}

/**
 * Get the period label for a bill cycle (e.g. "August 2026").
 * @param {string} periodStart - "YYYY-MM-DD"
 * @param {string} [locale] - 'en-US' | 'km-KH'
 * @returns {string}
 */
export function getPeriodLabel(periodStart, locale = 'en-US') {
  const [year, month] = periodStart.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

/**
 * Format a YYYY-MM-DD date string to a short label (e.g. "Aug 16").
 * @param {string} dateStr
 * @param {string} [locale]
 * @returns {string}
 */
export function formatDateShort(dateStr, locale = 'en-US') {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

/**
 * Check if a bill cycle's due date is in the past (overdue).
 * @param {string} dueDateStr - "YYYY-MM-DD"
 * @returns {boolean}
 */
export function isOverdue(dueDateStr) {
  return daysUntilDue(dueDateStr) < 0;
}

/**
 * Determine whether a bill cycle is a "savings" type cycle (quarterly/semi_annual/yearly)
 * that is NOT yet in its due period.
 *
 * Wi-Fi ($45 quarterly) should show as "savings" until its due month arrives.
 * In the due month/period, it becomes a real payment obligation.
 *
 * @param {string} frequency
 * @param {string} periodStart - "YYYY-MM-DD"
 * @param {string} dueDate - "YYYY-MM-DD"
 * @returns {boolean} true if this is a future savings cycle (not yet due for payment)
 */
export function isSavingsCycle(frequency, periodStart, dueDate) {
  if (frequency === 'monthly' || frequency === 'one_time') return false;

  const today = getTodayInHouseTimezone();
  const todayYM = today.slice(0, 7); // "YYYY-MM"
  const dueYM = dueDate.slice(0, 7);
  return dueYM > todayYM;
}
