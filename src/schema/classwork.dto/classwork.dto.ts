import { z } from 'zod';

export const createClassworkSchema = z.object({
    body: z.object({
        attachments: z.array(z.string()),
        uploadedUserRole: z.string(),
        title: z.string().default('No title'),
        description: z.string()
    }),
    params: z.object({
        termSubjectLevelId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        sectionId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        uploaderId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type CreateClassworkSchema = z.infer<typeof createClassworkSchema>;

export const findAllClassworksBySubjectsListSchema = z.object({
    params: z.object({
        termSubjectLevelIds: z.string().min(1, { message: 'At least one param string value required @ksm' }),
        teacherId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});

export type FindAllClassworksBySubjectsList = z.infer<typeof findAllClassworksBySubjectsListSchema>;

/* Find all classwork records for a termsubjectlevelid and sectionid */
export const findClassworkByTermAndSectionSchema = z.object({
    query: z.object({
        termSubjectLevelId: z.string().min(1, 'TermSubjectId is required'),
        sectionId: z.string().min(1, 'SectionId is required')
    }),
    params: z.object({
        teacherId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});

export type FindClassworkByTermAndSectionSchema = z.infer<typeof findClassworkByTermAndSectionSchema>;
export const findAssignedClassworkByTermAndSectionSchema = z.object({
    query: z.object({
        termSubjectLevelId: z.string().min(1, 'TermSubjectId is required'),
        sectionId: z.string().min(1, 'SectionId is required')
    }),
    params: z.object({
        teacherId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});

export type FindAssignedClassworkByTermAndSectionSchema = z.infer<typeof findAssignedClassworkByTermAndSectionSchema>;

export const findClassworkByIdSchema = z.object({
    params: z.object({
        classworkId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FindClassworkByIdSchema = z.infer<typeof findClassworkByIdSchema>;

/*edit Classwork*/
export const editClassworkSchema = z.object({
    body: z.object({
        uploadedUserRole: z.string(),
        title: z.string().default('No title'),
        description: z.string(),
        attachments: z.array(z.string()),
    }),
    params: z.object({
        classworkId: z.string().min(1, { message: 'Classwork ID is required' }),
        termSubjectLevelId: z.string().min(1),
        sectionId: z.string().min(1),
        uploaderId: z.string().min(1)
    })
});
export type EditClassworkSchema = z.infer<typeof editClassworkSchema>;
/*delete Classwork*/
export const deleteClassworkSchema = z.object({
    params: z.object({
        classworkId: z.string().min(1, { message: 'Classwork ID is required' })
    })
});

export type DeleteClassworkSchema = z.infer<typeof deleteClassworkSchema>;