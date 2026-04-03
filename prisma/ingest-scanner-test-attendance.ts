/**
 * Ingest school check-in attendance for scanner testing.
 *
 * This creates today's attendance records (or a provided date)
 * using backend rules that include only active students.
 *
 * Usage (from SLMS-apis):
 *   npm run ingest-scanner-test-attendance
 *   npm run ingest-scanner-test-attendance -- 2026-04-03
 */

import { createSchoolCheckInAttendanceForStudent } from '../src/service/admin.service/admin.checkin.service/admin.checkin.service';

function resolveDateArg(): string {
    const argDate = process.argv[2];
    if (argDate) return argDate;
    return new Date().toISOString().split('T')[0];
}

async function main() {
    const date = resolveDateArg();
    console.log(`Creating scanner test attendance for ${date}...`);

    await createSchoolCheckInAttendanceForStudent(date);

    console.log('Attendance ingest completed. Only active students are included.');
}

main()
    .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Ingest failed: ${message}`);
        process.exit(1);
    });
