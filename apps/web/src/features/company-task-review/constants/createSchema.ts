import { z } from 'zod';

export const companyTaskSchema = z.object({
  title: z.string().trim().min(1, 'Введите название задания.'),
  description: z.string().trim(),
  specializationId: z.string(),
  gradeId: z.string(),
  deadlineAt: z
    .string()
    .refine(
      (value) =>
        !value ||
        (Number.isFinite(Date.parse(value)) && Date.parse(value) > Date.now()),
      'Укажите будущую дату и время.',
    ),
  file: z
    .custom<File>(
      (value) => typeof File !== 'undefined' && value instanceof File,
      'Выберите файл условия.',
    )
    .superRefine((file, context) => {
      if (!file.size)
        context.addIssue({
          code: 'custom',
          message: 'Выберите непустой файл.',
        });
      if (file.size > 10 * 1024 * 1024)
        context.addIssue({
          code: 'custom',
          message: 'Файл должен быть не больше 10 МБ.',
        });
    }),
});

export type CompanyTaskFormValues = z.infer<typeof companyTaskSchema>;
