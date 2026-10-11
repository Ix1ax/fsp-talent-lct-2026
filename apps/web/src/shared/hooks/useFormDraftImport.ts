import { useEffect, useRef } from 'react';
import type {
  FieldValues,
  Path,
  PathValue,
  UseFormReturn,
} from 'react-hook-form';

export type FormDraftImport<T> = { id: string; values: Partial<T> };

export type FormDraftBridge<T> = {
  importedDraft?: FormDraftImport<T>;
  onDraftReader?: (reader: () => T) => void;
};

export const useFormDraftImport = <T extends FieldValues>(
  { getValues, setValue }: UseFormReturn<T>,
  { importedDraft, onDraftReader }: FormDraftBridge<T>,
) => {
  const applied = useRef<string | undefined>(undefined);

  useEffect(() => {
    onDraftReader?.(getValues);
  }, [getValues, onDraftReader]);

  useEffect(() => {
    if (!importedDraft || applied.current === importedDraft.id) return;
    applied.current = importedDraft.id;
    for (const [key, value] of Object.entries(importedDraft.values)) {
      setValue(key as Path<T>, value as PathValue<T, Path<T>>, {
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  }, [importedDraft, setValue]);
};
