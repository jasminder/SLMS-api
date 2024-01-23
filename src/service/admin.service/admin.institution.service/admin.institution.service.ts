// institution.service.ts

import { db } from '../../../utils/db.server';

export async function createInstitution(data: { name: string; address: string; logo?: string; contact: string; email: string }) {
    return await db.institution.create({
        data
    });
}

// institution.service.ts
export const getInstitution = async () => {
    return await db.institution.findFirst({});
};
