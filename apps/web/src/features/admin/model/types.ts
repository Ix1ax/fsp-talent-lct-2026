import type { z } from 'zod';

import type { questionFormSchema, templateFormSchema } from '../constants';

export type QuestionFormValues = z.infer<typeof questionFormSchema>;
export type TemplateFormValues = z.infer<typeof templateFormSchema>;
