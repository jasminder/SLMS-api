import { z } from 'zod';

// Feedback option for thr admin to edit create
export const createFeedbackCategoryWithOptionsSchema = z.object({
    body: z.object({
        categoryName: z.string().min(1, { message: 'Category name is required' }),
        options: z
            .array(
                z.object({
                    value: z.string().min(1, { message: 'Value is required' })
                })
            )
            .min(1, { message: 'At least one option is required' })
    })
});

export type CreateFeedbackCategoryWithOptionsSchema = z.infer<typeof createFeedbackCategoryWithOptionsSchema>;

export const getFeedbackCategorySchema = z.object({
    params: z.object({
        categoryId: z.string().regex(/^\d+$/, 'ID must be a number')
    })
});

export type GetFeedbackCategorySchema = z.infer<typeof getFeedbackCategorySchema>;

export const updateFeedbackCategorySchema = z.object({
    params: z.object({
        categoryId: z.string().regex(/^\d+$/, 'Category ID must be a number')
    }),
    body: z.object({
        categoryName: z.string().min(1, { message: 'Category name is required' }),
        options: z
            .array(
                z.object({
                    id: z.number().optional(),
                    value: z.string().min(1, { message: 'Value is required' })
                })
            )
            .min(1, { message: 'At least one option is required' })
    })
});

export type UpdateFeedbackCategorySchema = z.infer<typeof updateFeedbackCategorySchema>;

export const deleteFeedbackCategorySchema = z.object({
    params: z.object({
        categoryId: z.string().regex(/^\d+$/, 'Category ID must be a number')
    })
});

export type DeleteFeedbackCategorySchema = z.infer<typeof deleteFeedbackCategorySchema>;
