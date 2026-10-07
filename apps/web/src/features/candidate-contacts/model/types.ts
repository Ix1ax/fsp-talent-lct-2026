import type { z } from 'zod';

import type { contactsSchema } from '../constants';

export type ContactsFormValues = z.infer<typeof contactsSchema>;
