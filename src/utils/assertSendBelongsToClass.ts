import { db } from './db.server';
import { customError } from './customError';

/**
 * Refuse a homework/classwork send unless every item and every student belongs to the class being sent to.
 * Nov 2026: Jhnab 3 homework was delivered to Majha 1/2 students six times because the send page carried an item from
 * another class and the server accepted it. Students must be currently assigned to that class (termSubjectLevel + section).
 */
export async function assertSendBelongsToClass(
    kind: 'homework' | 'classwork',
    itemIds: (string | number)[],
    studentIds: (string | number)[],
    termSubjectLevelId: string | number,
    sectionId: string | number
) {
    const tsl = Number(termSubjectLevelId);
    const sec = Number(sectionId);
    if (!Number.isInteger(tsl) || !Number.isInteger(sec)) throw customError('Class or section missing for this send.', 'fail', 400, true);

    const ids = [...new Set(itemIds.map(Number))];
    if (ids.length > 0) {
        const where = { id: { in: ids } };
        const select = { id: true, termSubjectLevelId: true, sectionId: true };
        const items = kind === 'homework' ? await db.homework.findMany({ where, select }) : await db.classwork.findMany({ where, select });
        const wrong = ids.filter((id) => {
            const it = items.find((i) => i.id === id);
            return !it || it.termSubjectLevelId !== tsl || it.sectionId !== sec;
        });
        if (wrong.length > 0) {
            throw customError(
                `This ${kind} belongs to a different class, so it was not sent. Please go back to the class page and create or choose the ${kind} again.`,
                'fail',
                400,
                true
            );
        }
    }

    const sids = [...new Set(studentIds.map(Number))];
    if (sids.length > 0) {
        const inClass = await db.studentClassAssignment.findMany({
            where: { studentId: { in: sids }, termSubjectLevelId: tsl, sectionId: sec, isCurrentlyAssigned: true },
            select: { studentId: true }
        });
        const ok = new Set(inClass.map((a) => a.studentId));
        const outside = sids.filter((id) => !ok.has(id));
        if (outside.length > 0) {
            throw customError(
                `${outside.length} selected student(s) are not in this class, so nothing was sent. Please reload the page and try again.`,
                'fail',
                400,
                true
            );
        }
    }
}
