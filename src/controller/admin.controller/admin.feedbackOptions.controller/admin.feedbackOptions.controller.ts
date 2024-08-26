import { Request, Response, NextFunction } from 'express';

import {
    CreateFeedbackCategoryWithOptionsSchema,
    DeleteFeedbackCategorySchema,
    GetFeedbackCategorySchema,
    UpdateFeedbackCategorySchema
} from '../../../schema/admin.dto/admin.feedbackOptions.dto/admin.feedbackOptions.dto';
import {
    createFeedbackCategoryWithOptions,
    deleteFeedbackCategory,
    getAllFeedbackCategories,
    getSingleFeedbackCategory,
    updateFeedbackCategory
} from '../../../service/admin.service/admin.feedbackOptions.service/admin.feedbackOptions.service';

export const createFeedbackCategoryWithOptionsHandler = async (req: Request<{}, {}, CreateFeedbackCategoryWithOptionsSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { categoryName, options } = req.body;
    const adminId = 1;

    const newOptions = await createFeedbackCategoryWithOptions(categoryName, options, adminId);
    res.status(201).json(newOptions);
};
export const getAllFeedbackCategoriesHandler = async (req: Request<{}, {}, {}, {}>, res: Response, next: NextFunction) => {
    const newOptions = await getAllFeedbackCategories();
    res.status(201).json(newOptions);
};

export const getSingleFeedbackCategoryHandler = async (req: Request<GetFeedbackCategorySchema['params']>, res: Response, next: NextFunction) => {
    const { categoryId } = req.params;
    const category = await getSingleFeedbackCategory(categoryId);
    if (!category) {
        return res.status(404).json({ message: 'Feedback category not found' });
    }
    res.status(200).json(category);
};

export const updateFeedbackCategoryHandler = async (req: Request<UpdateFeedbackCategorySchema['params'], {}, UpdateFeedbackCategorySchema['body']>, res: Response, next: NextFunction) => {
    const { categoryId } = req.params;
    const { categoryName, options } = req.body;
    const adminId = 1;

    const updatedCategory = await updateFeedbackCategory(categoryId, categoryName, options, adminId);
    res.status(200).json(updatedCategory);
};

export const deleteFeedbackCategoryHandler = async (req: Request<DeleteFeedbackCategorySchema['params']>, res: Response, next: NextFunction) => {
    const { categoryId } = req.params;
    const adminId = 1;

    if (!adminId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    await deleteFeedbackCategory(categoryId);
    res.status(200).json({ message: 'Feedback category deleted successfully' });
};
