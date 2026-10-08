import type { z } from 'zod';

import type { contactsSchema } from './contactsSchema';

export type ContactsFormValues = z.infer<typeof contactsSchema>;
