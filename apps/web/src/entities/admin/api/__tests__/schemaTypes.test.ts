import { expectTypeOf, it } from 'vitest';
import type { z } from 'zod';

import type {
  AdminAccount,
  AdminSession,
  CatalogItem,
  Page,
  Preview,
  PreviewAnswer,
  Question,
  QuestionVersion,
  Shortage,
  Template,
} from '../../model';
import type { previewAnswerSchema, previewSchema } from '../previewSchemas';
import type {
  accountSchema,
  adminSchemas,
  catalogSchema,
  loginSchema,
  questionSchema,
  shortageSchema,
  templateSchema,
  versionSchema,
} from '../schemas';

it('keeps explicit domain types equal to validated API response types', () => {
  expectTypeOf<AdminAccount>().toEqualTypeOf<z.output<typeof accountSchema>>();
  expectTypeOf<AdminSession>().toEqualTypeOf<z.output<typeof loginSchema>>();
  expectTypeOf<CatalogItem>().toEqualTypeOf<z.output<typeof catalogSchema>>();
  expectTypeOf<Question>().toEqualTypeOf<z.output<typeof questionSchema>>();
  expectTypeOf<QuestionVersion>().toEqualTypeOf<
    z.output<typeof versionSchema>
  >();
  expectTypeOf<Shortage>().toEqualTypeOf<z.output<typeof shortageSchema>>();
  expectTypeOf<Template>().toEqualTypeOf<z.output<typeof templateSchema>>();
  expectTypeOf<Preview>().toEqualTypeOf<z.output<typeof previewSchema>>();
  expectTypeOf<PreviewAnswer>().toEqualTypeOf<
    z.output<typeof previewAnswerSchema>
  >();
  expectTypeOf<Page<CatalogItem>>().toEqualTypeOf<
    z.output<typeof adminSchemas.catalogs>
  >();
});
