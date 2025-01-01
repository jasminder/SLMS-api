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
    const currentDate = new Date()
    return days[currentDate.getDay()]
  }