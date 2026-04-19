import moment from 'moment-timezone';

const TIMEZONE = process.env.TIMEZONE || 'Australia/Sydney';

export function getCurrentDay(): string {
    const days = [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ]
    const currentDate = moment.tz(TIMEZONE);
    return days[currentDate.day()]
  }