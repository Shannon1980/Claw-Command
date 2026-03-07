/**
 * Lightweight cron expression parser.
 * Supports standard 5-field cron: minute hour day-of-month month day-of-week
 */

interface CronFields {
  minutes: number[];
  hours: number[];
  daysOfMonth: number[];
  months: number[];
  daysOfWeek: number[];
}

function parseField(field: string, min: number, max: number): number[] {
  const values: Set<number> = new Set();

  for (const part of field.split(",")) {
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    const step = stepMatch ? parseInt(stepMatch[2], 10) : 1;
    const range = stepMatch ? stepMatch[1] : part;

    if (range === "*") {
      for (let i = min; i <= max; i += step) values.add(i);
    } else if (range.includes("-")) {
      const [startStr, endStr] = range.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i += step) values.add(i);
      }
    } else {
      const val = parseInt(range, 10);
      if (!isNaN(val)) values.add(val);
    }
  }

  return [...values].sort((a, b) => a - b);
}

function parseCron(expr: string): CronFields | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  return {
    minutes: parseField(parts[0], 0, 59),
    hours: parseField(parts[1], 0, 23),
    daysOfMonth: parseField(parts[2], 1, 31),
    months: parseField(parts[3], 1, 12),
    daysOfWeek: parseField(parts[4], 0, 6),
  };
}

function matchesCron(fields: CronFields, date: Date): boolean {
  const minute = date.getUTCMinutes();
  const hour = date.getUTCHours();
  const dayOfMonth = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const dayOfWeek = date.getUTCDay();

  return (
    fields.minutes.includes(minute) &&
    fields.hours.includes(hour) &&
    fields.daysOfMonth.includes(dayOfMonth) &&
    fields.months.includes(month) &&
    fields.daysOfWeek.includes(dayOfWeek)
  );
}

/**
 * Compute the next run time after `after` for a given cron expression.
 * Searches up to 366 days into the future.
 */
export function computeNextRun(cronExpr: string, after: Date): Date | null {
  const fields = parseCron(cronExpr);
  if (!fields) return null;

  // Start from the next minute boundary
  const candidate = new Date(after);
  candidate.setUTCSeconds(0, 0);
  candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);

  const limit = 366 * 24 * 60; // max iterations (1 year in minutes)
  for (let i = 0; i < limit; i++) {
    if (matchesCron(fields, candidate)) {
      return candidate;
    }
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
  }

  return null;
}

/**
 * Check if a cron job is due to run.
 * A job is due if current time >= next_run_at, or if next_run_at is not set
 * and the cron expression matches the current minute.
 */
export function isDue(cronExpr: string, nextRunAt: string | null, now: Date): boolean {
  if (nextRunAt) {
    return now >= new Date(nextRunAt);
  }
  // Fallback: check if cron expression matches current minute
  const fields = parseCron(cronExpr);
  if (!fields) return false;
  return matchesCron(fields, now);
}
