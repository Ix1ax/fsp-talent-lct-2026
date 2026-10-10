import { z } from 'zod';

import { validateSolutionFile } from '../lib';

export const solutionSchema = z.object({
  file: z
    .custom<File>(
      (value) => typeof File !== 'undefined' && value instanceof File,
      'Выберите файл решения.',
    )
    .superRefine((file, context) => {
      const message = validateSolutionFile(file);
      if (message) context.addIssue({ code: 'custom', message });
    }),
  confirmed: z
    .boolean()
    .refine((value) => value, 'Подтвердите окончательную отправку.'),
});

export type SolutionFormValues = z.infer<typeof solutionSchema>;
