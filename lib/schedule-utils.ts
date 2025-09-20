import { addDays, addHours, set, startOfDay, parseISO, endOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz'; // Corrected imports

/**
 * Defines the complete shape of a schedule object.
 */
export interface Schedule {
    is_scheduled: boolean;
    frequency?: 'daily' | 'hourly' | 'weekly' | 'monthly' | 'yearly' | 'specific_dates' | null;
    schedule_time?: string | null;      // "HH:MM" (24h format)
    timezone?: string | null;           // IANA Timezone Identifier, e.g., "America/New_York"
    start_date?: string | null;         // "YYYY-MM-DD"
    end_date?: string | null;           // "YYYY-MM-DD"
    hourly_interval?: number | null;
    selected_weekdays?: string[] | null;
    day_of_month?: number | null;
    selected_year?: number | null;
    selected_month?: number | null;     // 1-12
    selected_day?: number | null;       // 1-31
    specific_dates?: string[] | null;
    last_executed?: string | null;      // ISO string from database
    start_month?: number | null;
    end_month?: number | null;
}

const weekdayMap: { [key: string]: number } = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

/**
 * Calculates the next UTC execution time for a given schedule.
 * @param schedule The schedule configuration object.
 * @returns A Date object (in UTC) for the next execution, or null if no further executions are scheduled.
 */
export function calculateNextExecution(schedule: Partial<Schedule>): Date | null {
    if (!schedule.is_scheduled || !schedule.frequency || !schedule.timezone) {
        return null;
    }

    const { timezone } = schedule;
    const now = new Date(); // Current time in UTC

    // --- Special Case: Hourly (Logic is mostly UTC-based) ---
    if (schedule.frequency === 'hourly') {
        if (!schedule.hourly_interval || schedule.hourly_interval < 1) {
            schedule.hourly_interval = 1
        };
        const lastExecutedUTC = schedule.last_executed ? new Date(schedule.last_executed) : now;
        let nextDateUTC = addHours(lastExecutedUTC, schedule.hourly_interval);
        if (nextDateUTC < now) {
            nextDateUTC = addHours(now, schedule.hourly_interval);
        }
        // ... (rest of hourly logic remains the same)
        return nextDateUTC;
    }

    // --- All Other Frequencies (tied to a specific time of day) ---
    if (!schedule.schedule_time) return null;

    const [hours, minutes] = schedule.schedule_time.split(':').map(Number);

    // Use toZonedTime to get a date object that "thinks" it's in the target timezone
    const nowInZone = toZonedTime(now, timezone);
    const lastExecutedInZone = schedule.last_executed ? toZonedTime(new Date(schedule.last_executed), timezone) : null;

    let candidateDate = startOfDay(nowInZone);
    if (lastExecutedInZone && startOfDay(lastExecutedInZone) >= candidateDate) {
        candidateDate = addDays(startOfDay(lastExecutedInZone), 1);
    }

    candidateDate = set(candidateDate, { hours, minutes, seconds: 0, milliseconds: 0 });

    if (candidateDate <= nowInZone) {
        candidateDate = addDays(candidateDate, 1);
    }

    const startDate = schedule.start_date ? toZonedTime(new Date(schedule.start_date), timezone) : null;
    const endDate = schedule.end_date ? toZonedTime(new Date(schedule.end_date), timezone) : null;

    if (startDate && candidateDate < startDate) {
        candidateDate = set(startDate, { hours, minutes, seconds: 0, milliseconds: 0 });
    }

    for (let i = 0; i < 730; i++) {
        if (endDate && candidateDate > endOfDay(endDate)) return null;

        let isValidDay = false;
        switch (schedule.frequency) {
            case 'daily':
                isValidDay = true;
                break;
            case 'weekly':
                const desiredDays = schedule.selected_weekdays?.map(day => weekdayMap[day.toLowerCase()]) || [];
                isValidDay = desiredDays.includes(candidateDate.getDay());
                break;
            case 'monthly':
                const currentMonth = candidateDate.getMonth() + 1; // getMonth() is 0-indexed
                const startMonth = schedule.start_month || 1;
                const endMonth = schedule.end_month || 12;

                // Check if the current month is within the desired range
                const isMonthValid = currentMonth >= startMonth && currentMonth <= endMonth;

                if (isMonthValid && candidateDate.getDate() === schedule.day_of_month) {
                    isValidDay = true;
                }
                break;
            case 'yearly':
                isValidDay =
                    candidateDate.getMonth() + 1 === schedule.selected_month &&
                    candidateDate.getDate() === schedule.selected_day &&
                    (!schedule.selected_year || candidateDate.getFullYear() === schedule.selected_year);
                break;
            case 'specific_dates':
                const formattedCandidate = format(candidateDate, 'yyyy-MM-dd', { timeZone: timezone });
                isValidDay = schedule.specific_dates?.includes(formattedCandidate) ?? false;
                break;
        }

        if (isValidDay) {
            // ======================================================
            // 🔽 **CORRECTED CONVERSION TO UTC** 🔽
            // ======================================================
            // Take the date parts of `candidateDate` and interpret them AS if they are in the target timezone,
            // then convert that interpretation to the correct UTC timestamp.
            return fromZonedTime(candidateDate, timezone);
        }

        candidateDate = addDays(candidateDate, 1);
    }

    return null; // No valid date found
}