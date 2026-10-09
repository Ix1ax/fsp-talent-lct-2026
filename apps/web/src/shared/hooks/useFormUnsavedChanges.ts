import {
  type FieldValues,
  type UseFormReturn,
  useWatch,
} from 'react-hook-form';

import { normalizeDraftValues, serializeDraftValues } from './draftValues';
import { useUnsavedChanges } from './useUnsavedChanges';

type FormUnsavedChangesOptions<T> = {
  preserveWithin?: readonly string[];
  initialDraft?: boolean;
  normalize?: (values: T) => unknown;
};
export const useFormUnsavedChanges = <T extends FieldValues>(
  form: UseFormReturn<T>,
  options: FormUnsavedChangesOptions<T> = {},
) => {
  const values = useWatch({ control: form.control }) as T;
  const defaults = form.formState.defaultValues as T;
  const normalize = options.normalize ?? normalizeDraftValues;
  const dirty =
    !!options.initialDraft ||
    (form.formState.isDirty &&
      serializeDraftValues(normalize(values)) !==
        serializeDraftValues(normalize(defaults)));
  return {
    ...useUnsavedChanges(dirty, { preserveWithin: options.preserveWithin }),
    dirty,
  };
};
