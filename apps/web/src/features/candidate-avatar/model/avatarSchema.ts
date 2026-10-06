import { z } from 'zod';

export const avatarSourceSchema = z.object({
  file: z
    .custom<File>(
      (value) => typeof File !== 'undefined' && value instanceof File,
      'Выберите фото.',
    )
    .refine(
      (file) => ['image/jpeg', 'image/png'].includes(file.type),
      'Выберите изображение JPEG или PNG.',
    )
    .superRefine(async (file, ctx) => {
      if (!['image/jpeg', 'image/png'].includes(file.type)) return;
      try {
        const bitmap = await createImageBitmap(file);
        bitmap.close();
      } catch {
        ctx.addIssue({
          code: 'custom',
          message: 'Не удалось прочитать изображение. Выберите другой файл.',
        });
      }
    }),
});

export const avatarSchema = z.object({
  file: z
    .custom<File>(
      (value) => typeof File !== 'undefined' && value instanceof File,
      'Выберите фото.',
    )
    .refine(
      (file) => file.size <= 2 * 1024 * 1024,
      'Размер изображения не должен превышать 2 МиБ.',
    )
    .refine(
      (file) => ['image/jpeg', 'image/png'].includes(file.type),
      'Выберите изображение JPEG или PNG.',
    )
    .superRefine(async (file, ctx) => {
      if (
        file.size > 2 * 1024 * 1024 ||
        !['image/jpeg', 'image/png'].includes(file.type)
      )
        return;
      try {
        const bitmap = await createImageBitmap(file);
        const pixels = bitmap.width * bitmap.height;
        bitmap.close();
        if (pixels > 4_000_000)
          ctx.addIssue({
            code: 'custom',
            message:
              'Разрешение изображения не должно превышать 4 мегапикселя.',
          });
      } catch {
        ctx.addIssue({
          code: 'custom',
          message: 'Не удалось прочитать изображение. Выберите другой файл.',
        });
      }
    }),
});
