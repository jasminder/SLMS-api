import { z } from 'zod';

//admin.communication.dto
export const createEmailTemplateSchema = z.object({
    params: z.object({
        adminId: z.string().min(1, { message: 'Admin ID is required' })
    }),
    body: z.object({
        name: z.string().min(1, { message: 'Name is required' }),
        subject: z.string().min(1, { message: 'Subject is required' }),
        text: z.string().min(1, { message: 'Text is required' })
    })
});

export type CreateEmailTemplateSchema = z.infer<typeof createEmailTemplateSchema>;

export const updateEmailTemplateSchema = z.object({
    params: z.object({
        templateId: z.string().min(1, { message: 'Template ID is required' })
    }),
    body: z.object({
        name: z.string().min(1, { message: 'Name is required' }),
        subject: z.string().min(1, { message: 'Subject is required' }),
        text: z.string().min(1, { message: 'Text is required' })
    })
});

export type UpdateEmailTemplateSchema = z.infer<typeof updateEmailTemplateSchema>;

export const deleteEmailTemplateSchema = z.object({
    params: z.object({
        templateId: z.string().min(1, { message: 'Template ID is required' })
    })
});

export type DeleteEmailTemplateSchema = z.infer<typeof deleteEmailTemplateSchema>;

export const fetchEmailContentByDateSchema = z.object({
    params: z.object({
        date: z.string().min(1, { message: 'Date is required' })
    })
});

export type FetchEmailContentByDateSchema = z.infer<typeof fetchEmailContentByDateSchema>;

// sending enrollment confirmation mail
export const createEnrollmentConfirmationEmailTemplateSchema = z.object({
    params: z.object({
        adminId: z.string().min(1, { message: 'Admin ID is required' })
    }),
    body: z.object({
        name: z.string().min(1, { message: 'Name is required' }),
        description: z.string().optional(),
        subject: z.string().min(1, { message: 'Subject is required' }),
        text: z.string().min(1, { message: 'Text is required' })
    })
});

export type CreateEnrollmentConfirmationEmailTemplateSchema = z.infer<typeof createEnrollmentConfirmationEmailTemplateSchema>;
export const updateEnrollmentConfirmationEmailTemplateSchema = z.object({
    params: z.object({
        templateId: z.string().min(1, { message: 'Template ID is required' })
    }),
    body: z.object({
        name: z.string().min(1, { message: 'Name is required' }),
        description: z.string().optional(),
        subject: z.string().min(1, { message: 'Subject is required' }),
        text: z.string().min(1, { message: 'Text is required' })
    })
});

export type UpdateEnrollmentConfirmationEmailTemplateSchema = z.infer<typeof updateEnrollmentConfirmationEmailTemplateSchema>;
export const deleteEnrollmentConfirmationEmailTemplateSchema = z.object({
    params: z.object({
      templateId: z.string().min(1, { message: 'Template ID is required' })
    })
  });
  
  export type DeleteEnrollmentConfirmationEmailTemplateSchema = z.infer<typeof deleteEnrollmentConfirmationEmailTemplateSchema>;