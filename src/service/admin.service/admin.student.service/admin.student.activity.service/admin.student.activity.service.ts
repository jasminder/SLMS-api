import { Prisma } from '@prisma/client';
import { db } from '../../../../utils/db.server';

export type StudentProfileActivityPayload = {
    studentId: number;
    actionType: string;
    description: string;
    metadata?: Record<string, unknown>;
    performedByUserId?: number;
    performedByEmail: string;
};

/**
 * Records an activity on a student profile (e.g. section change, detail update).
 * Call this after successful updates to track who did what and when.
 */
export async function recordStudentProfileActivity(payload: StudentProfileActivityPayload) {
    return db.studentProfileActivity.create({
        data: {
            studentId: payload.studentId,
            actionType: payload.actionType,
            description: payload.description,
            metadata: (payload.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
            performedByUserId: payload.performedByUserId ?? null,
            performedByEmail: payload.performedByEmail,
        },
    });
}

/** "gatka · Gatka1 · TUE 5-6 pm" — the way a class is named throughout the admin UI. */
const formatClassLabel = (subject?: string | null, level?: string | null, section?: string | null) =>
    [subject, level, section].map((part) => part?.toString().trim()).filter(Boolean).join(' · ');

/**
 * Turns an entry's raw metadata into a sentence an admin can read.
 *
 * Older CLASS_REMOVED / CLASS_TOGGLE entries recorded nothing but `{assignmentId: 4893}`,
 * which said that *something* was removed but never what. Because removals are a soft
 * delete, the assignment row still exists, so the class can be resolved at read time and
 * historical entries become readable without touching stored data.
 *
 * Returns '' when there is nothing useful to add — the description already stands alone
 * for entries like "Personal details updated".
 */
function buildActivityDetails(
    actionType: string,
    metadata: unknown,
    classByAssignmentId: Map<number, string>
): string {
    if (!metadata || typeof metadata !== 'object') return '';
    const meta = metadata as Record<string, unknown>;

    const assignmentId = typeof meta.assignmentId === 'number' ? meta.assignmentId : undefined;
    if (assignmentId !== undefined) {
        return classByAssignmentId.get(assignmentId) ?? `Assignment #${assignmentId} (no longer available)`;
    }

    if (actionType === 'SECTION_CHANGE') {
        return formatClassLabel(
            meta.subjectName as string | undefined,
            meta.levelName as string | undefined,
            meta.sectionName as string | undefined
        );
    }

    if (actionType === 'ENROLLMENT' || actionType === 'DE_ENROLLMENT') {
        const rows = Array.isArray(meta.enrollData) ? meta.enrollData : [];
        const subjects = [
            ...new Set(
                rows
                    .map((row) => (row && typeof row === 'object' ? (row as Record<string, unknown>).subject : undefined))
                    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
            )
        ];
        return subjects.join(', ');
    }

    return '';
}

/**
 * Fetches activity log for a student, newest first, with a human-readable `details`
 * string alongside the raw metadata.
 */
export async function getStudentProfileActivities(studentId: string, limit = 100) {
    const activities = await db.studentProfileActivity.findMany({
        where: { studentId: +studentId },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 200),
        select: {
            id: true,
            actionType: true,
            description: true,
            metadata: true,
            performedByEmail: true,
            createdAt: true,
        },
    });

    // Resolve every referenced assignment in one query rather than per row.
    const assignmentIds = [
        ...new Set(
            activities
                .map((a) => (a.metadata as Record<string, unknown> | null)?.assignmentId)
                .filter((id): id is number => typeof id === 'number')
        )
    ];

    const classByAssignmentId = new Map<number, string>();
    if (assignmentIds.length > 0) {
        const assignments = await db.studentClassAssignment.findMany({
            where: { id: { in: assignmentIds } },
            select: {
                id: true,
                section: { select: { name: true } },
                termSubjectLevel: {
                    select: {
                        subject: { select: { name: true } },
                        level: { select: { name: true } }
                    }
                }
            }
        });
        for (const a of assignments) {
            const label = formatClassLabel(
                a.termSubjectLevel?.subject?.name,
                a.termSubjectLevel?.level?.name,
                a.section?.name
            );
            if (label) classByAssignmentId.set(a.id, label);
        }
    }

    return activities.map((activity) => ({
        ...activity,
        details: buildActivityDetails(activity.actionType, activity.metadata, classByAssignmentId)
    }));
}
