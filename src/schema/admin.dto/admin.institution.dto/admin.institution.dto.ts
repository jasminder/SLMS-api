// institution.dto.ts
import { z } from 'zod';

export const createInstitutionSchema = z.object({
  body: z.object({
    name: z.string(),
    address: z.string(),
    logo: z.string().optional(),
    contact: z.string(),
    email: z.string().email(),
  })
});

export type CreateInstitutionSchema = z.infer<typeof createInstitutionSchema>;
