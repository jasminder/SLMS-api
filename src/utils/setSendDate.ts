export function setSendDate() {
    const now = new Date();
    now.setHours(16, 30, 0, 0); // Set time to 4:30 PM

    return now;
}
