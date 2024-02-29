import { db } from '../../../utils/db.server';

export async function findAllTermSubjectsForCurrentTerm() {
    // Find the current term
    const currentTerm = await db.term.findFirst({
        where: {
            currentTerm: true
        },
        select: {
            id: true
        }
    });

    // Check if current term is found
    if (!currentTerm) {
        throw new Error('No active term found.');
    }

    // Find all term subjects for the current term
    const termSubjects = await db.termSubject.findMany({
        where: {
            termId: currentTerm.id
        },
        include: {
            subject: true,
            subjectEnrollments: true
        }
    });

    return termSubjects;
}
