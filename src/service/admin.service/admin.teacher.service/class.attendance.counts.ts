/**
 * Class attendance buckets (Scope of Work item 14).
 *
 * Every student of a class falls into exactly ONE bucket, so the buckets always add up to the class (the roll):
 *   present    the teacher marked the student PRESENT for the class
 *   leave      approved leave (class status LEAVE, or the school check-in row is on leave)
 *   notMarked  checked in at the school gate, but the teacher has not marked the student present
 *   absent     not at school ("Not here")
 *
 * Why this exists: View Class and Class Records each counted in their own way. A student on leave is stored as
 * checkedIn=false, isMarked=false, so View Class counted them under "Not checked in" and again under "Leave", and Class
 * Records counted them as "Checked in" (total minus not checked in). A student who had checked in but was never marked
 * present showed as "Absent" on Class Records and as "Checked in" on View Class.
 *
 * Order matters:
 *   1. PRESENT wins. A teacher's mark is the strongest fact, and syncLeaveAttendance never overwrites PRESENT either.
 *   2. Leave comes next, so a leave student is never counted as checked in or absent.
 *   3. A student checked in at the gate with no PRESENT mark is "notMarked", not absent.
 *   4. Everyone else is "absent" (not here).
 * "Checked in" (at school) = present + notMarked. Leave is never part of it.
 *
 * Pure and import-free so it can be unit-tested without a database. The web client has the same rule in
 * SLMS-client/src/helpers/attendance/classAttendanceCounts.ts; keep the two in step.
 */
export type ClassAttendanceBucket = 'present' | 'leave' | 'notMarked' | 'absent';

export type ClassAttendanceRow = {
    classAttendance?: { attendanceStatus?: string | null } | null;
    checkInData?: { checkedIn?: boolean | null; isMarked?: boolean | null; isOnLeave?: boolean | null } | null;
};

export type ClassAttendanceSummary = {
    total: number;
    /** at school and marked present for the class */
    present: number;
    /** at school, but not marked present by the teacher yet */
    notMarked: number;
    /** present + notMarked: everyone who is at school (leave is never included) */
    checkedIn: number;
    leave: number;
    /** not at school ("Not here") */
    absent: number;
    /** same as absent; kept so older readers of the summary keep working */
    notCheckedIn: number;
};

export function classifyClassAttendance(row: ClassAttendanceRow): ClassAttendanceBucket {
    const status = row.classAttendance?.attendanceStatus;
    if (status === 'PRESENT') return 'present';
    if (status === 'LEAVE' || row.checkInData?.isOnLeave) return 'leave';
    if (row.checkInData?.checkedIn) return 'notMarked';
    return 'absent';
}

export function summariseClassAttendance(rows: readonly ClassAttendanceRow[]): ClassAttendanceSummary {
    let present = 0;
    let notMarked = 0;
    let leave = 0;
    let absent = 0;
    for (const row of rows) {
        const bucket = classifyClassAttendance(row);
        if (bucket === 'present') present++;
        else if (bucket === 'notMarked') notMarked++;
        else if (bucket === 'leave') leave++;
        else absent++;
    }
    return { total: rows.length, present, notMarked, checkedIn: present + notMarked, leave, absent, notCheckedIn: absent };
}
