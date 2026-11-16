import { db } from '../../utils/db.server';

export type ClassRecordKind = 'HOMEWORK' | 'CLASSWORK';
export type EditableFields = { title: string | null; description: string | null; attachments: string[] };
export type Editor = { userId?: number; email?: string; role: string };

const same = (a: string | null | undefined, b: string | null | undefined) => (a ?? '') === (b ?? '');

/**
 * Save one history row per field that actually changed (SOW item 32): who, which field, the old value and the new value.
 * Never throws into the edit itself: a failure to write history is logged, the edit stays saved.
 */
export async function recordClassRecordEdit(kind: ClassRecordKind, recordId: number, before: EditableFields, after: EditableFields, editor: Editor) {
    const rows: { field: string; oldValue: string | null; newValue: string | null }[] = [];
    if (!same(before.title, after.title)) rows.push({ field: 'title', oldValue: before.title, newValue: after.title });
    if (!same(before.description, after.description)) rows.push({ field: 'description', oldValue: before.description, newValue: after.description });
    const oldFiles = (before.attachments ?? []).join('\n');
    const newFiles = (after.attachments ?? []).join('\n');
    if (oldFiles !== newFiles) rows.push({ field: 'attachments', oldValue: oldFiles || null, newValue: newFiles || null });
    if (rows.length === 0) return;
    try {
        await db.classRecordEdit.createMany({
            data: rows.map((r) => ({ kind, recordId, ...r, editorRole: editor.role, editorUserId: editor.userId ?? null, editorEmail: editor.email ?? null }))
        });
    } catch (error) {
        console.error('Could not save the edit history', error);
    }
}

export async function listClassRecordEdits(kind: ClassRecordKind, recordId: number) {
    return db.classRecordEdit.findMany({ where: { kind, recordId }, orderBy: { createdAt: 'desc' } });
}

export type SendStatus = 'SCHEDULED' | 'SENT' | 'NONE';

/**
 * Where a classwork or homework item stands with parents, so the edit screen can warn the person editing:
 *  SCHEDULED  it is in a group not yet sent: an edit changes what parents will receive (the unsent copies are rewritten)
 *  SENT       it was sent and nothing is waiting: an edit changes the school record only, parents keep what they got
 *  NONE       it was never put in a send
 * Scheduled wins if both exist, because that is the case an edit can still reach parents.
 */
export async function getSendStatus(kind: ClassRecordKind, id: number): Promise<SendStatus> {
    if (kind === 'HOMEWORK') {
        const scheduled = await db.homeworkSnapshot.count({ where: { homeworkId: id, groupHomework: { isSent: false } } });
        if (scheduled > 0) return 'SCHEDULED';
        const sent =
            (await db.sentHomeworkSnapshot.count({ where: { homeworkId: id } })) +
            (await db.homeworkSnapshot.count({ where: { homeworkId: id, groupHomework: { isSent: true } } }));
        return sent > 0 ? 'SENT' : 'NONE';
    }
    const scheduled = await db.classworkSnapshot.count({ where: { classworkId: id, groupClasswork: { isSent: false } } });
    if (scheduled > 0) return 'SCHEDULED';
    const sent =
        (await db.sentClassworkSnapshot.count({ where: { classworkId: id } })) +
        (await db.classworkSnapshot.count({ where: { classworkId: id, groupClasswork: { isSent: true } } }));
    return sent > 0 ? 'SENT' : 'NONE';
}
