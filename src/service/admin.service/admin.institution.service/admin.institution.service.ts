// institution.service.ts

import { db } from '../../../utils/db.server';

export async function createInstitution(data: { name: string; address: string; logo: string; contact: string; contactSecondary: string; contactTertiary: string; email: string, accountName:string, BSB:string,accountNumber:string }) {
    return await db.institution.create({
        data
    });
}

export const getInstitution = async () => {
    return await db.institution.findFirst({
        orderBy: {
            createdAt: 'desc' // Order by creation date in descending order
        }
    });
};
