import { z } from 'zod';

export const taskReviewSchema = z
  .object({
    score: z
      .string()
      .trim()
      .refine((value) => {
        if (!value) return true;
        const score = Number(value);
        return Number.isInteger(score) && score >= 0 && score <= 100;
      }, 'Укажите целое число от 0 до 100.'),
    feedback: z
      .string()
      .trim()
      .max(5000, 'Комментарий должен быть не длиннее 5000 символов.'),
  })
  .superRefine(({ score, feedback }, context) => {
    if (!score && !feedback) {
      context.addIssue({
        code: 'custom',
        path: ['score'],
        message: 'Укажите оценку или комментарий.',
      });
    }
  });

export type TaskReviewFormValues = z.infer<typeof taskReviewSchema>;
