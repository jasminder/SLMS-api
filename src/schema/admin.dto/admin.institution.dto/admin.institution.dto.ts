// institution.dto.ts
import { z } from 'zod';

export const createInstitutionSchema = z.object({
    body: z.object({
        name: z.string(),
        address: z.string(),
        logo: z.string(),
        contact: z.string(),
        contactSecondary: z.string(),
        contactTertiary: z.string(),
        email: z.string().email(),
        accountName: z.string(),
        accountNumber: z.string(),
        BSB: z.string()
    })
});

export type CreateInstitutionSchema = z.infer<typeof createInstitutionSchema>;
