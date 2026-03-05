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

/**
 * Fetches activity log for a student, newest first.
 */
export async function getStudentProfileActivities(studentId: string, limit = 100) {
    return db.studentProfileActivity.findMany({
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
}
