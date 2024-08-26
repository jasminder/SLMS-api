import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';

type FeedbackOption = {
    value: string;
};

export async function createFeedbackCategoryWithOptions(categoryName: string, options: FeedbackOption[], adminId: 1) {
    // Use a transaction to ensure atomic operation
    return await db.$transaction(async (prisma) => {
        // Check if category already exists
        const existingCategory = await prisma.feedbackCategory.findUnique({
            where: { name: categoryName }
        });

        if (existingCategory) {
            throw customError('Feedback category already exists', 'fail', 400, true);
        }

        // Create new category
        const newCategory = await prisma.feedbackCategory.create({
            data: { name: categoryName }
        });

        // Create options for the new category
        const createdOptions = await Promise.all(
            options.map((option) =>
                prisma.adminFeedbackOption.create({
                    data: {
                        categoryId: newCategory.id,
                        value: option.value,
                        createdBy: adminId
                    }
                })
            )
        );

        return {
            category: newCategory,
            options: createdOptions
        };
    });
}

export async function getAllFeedbackCategories() {
    const categories = await db.feedbackCategory.findMany({
        include: {
            options: {
                select: {
                    id: true,
                    value: true,
                    createdBy: true,
                    createdAt: true,
                    updatedAt: true
                }
            }
        },
        orderBy: {
            updatedAt: 'desc'
        }
    });

    return categories;
}

export async function getSingleFeedbackCategory(categoryId: string) {
    const category = await db.feedbackCategory.findUnique({
        where: { id: +categoryId },
        include: {
            options: {
                select: {
                    id: true,
                    value: true,
                    createdBy: true,
                    createdAt: true,
                    updatedAt: true
                }
            }
        }
    });

    if (!category) {
        throw customError('Feedback category not found', 'fail', 404, true);
    }

    return category;
}
export async function updateFeedbackCategory(categoryId: string, categoryName: string, options: { id?: number; value: string }[], adminId: number) {
    return await db.$transaction(async (prisma) => {
        const updatedCategory = await prisma.feedbackCategory.update({
            where: { id: +categoryId },
            data: { name: categoryName }
        });

        const updatedOptions = await Promise.all(
            options.map(async (option) => {
                if (option.id) {
                    return prisma.adminFeedbackOption.update({
                        where: { id: option.id },
                        data: { value: option.value }
                    });
                } else {
                    return prisma.adminFeedbackOption.create({
                        data: {
                            categoryId: +categoryId,
                            value: option.value,
                            createdBy: adminId
                        }
                    });
                }
            })
        );

        // Delete options that are not in the updated list
        await prisma.adminFeedbackOption.deleteMany({
            where: {
                categoryId: +categoryId,
                id: { notIn: updatedOptions.map((o) => o.id) }
            }
        });

        return {
            category: updatedCategory,
            options: updatedOptions
        };
    });
}

export async function deleteFeedbackCategory(categoryId: string) {
    const cat = await db.feedbackCategory.findUnique({
        where: {
            id: +categoryId
        }
    });
    if (!cat) throw customError('Failed to delete feedback category', 'error', 500, true);
    await db.feedbackCategory.delete({
        where: { id: +categoryId }
    });
}
