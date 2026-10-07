import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';
import type { NeedInput, NeedStatus } from '@/entities/employer-need';

import { toNeedInput, validateNeed } from '../lib';

export type NeedEditorOptions = {
  initial: NeedInput;
  isNew?: boolean;
  onSave: (value: NeedInput) => Promise<void>;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
};

export const useNeedEditor = ({
  initial,
  isNew,
  onSave,
  onCancel,
  onDirtyChange,
}: NeedEditorOptions) => {
  const defaults = useMemo(() => toNeedInput(initial), [initial]);
  const form = useForm<NeedInput>({ defaultValues: defaults });
  const value = useWatch({
    control: form.control,
    defaultValue: defaults,
  }) as NeedInput;
  const dirty = form.formState.isDirty;
  const [editing, setEditing] = useState(!!isNew);
  const [advanced, setAdvanced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const [attemptedStatus, setAttemptedStatus] = useState<NeedStatus | null>(
    null,
  );
  const changeValue = (next: NeedInput) => {
    for (const key of Object.keys(defaults) as (keyof NeedInput)[]) {
      if (!Object.is(value[key], next[key]))
        form.setValue(key, next[key], { shouldDirty: true });
    }
    if (attemptedStatus) setErrors(validateNeed(next, attemptedStatus));
  };
  const change = (patch: Partial<NeedInput>) =>
    changeValue({ ...value, ...patch });
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);
  const submit = async (status: NeedStatus) => {
    setSaveError('');
    const normalized = {
      ...value,
      title: value.title.trim(),
      description: value.description.trim(),
      city: value.city?.trim() || null,
      timezone: value.timezone?.trim() || null,
      status,
    };
    setAttemptedStatus(status);
    const nextErrors = validateNeed(normalized, status);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setEditing(true);
      if (nextErrors.city || nextErrors.timezone || nextErrors.skills) {
        setAdvanced(true);
      }
      return;
    }
    try {
      await onSave(normalized);
    } catch (error) {
      setSaveError(getApiErrorMessage(error));
    }
  };
  const cancel = () => {
    form.reset(defaults);
    setErrors({});
    setSaveError('');
    setAttemptedStatus(null);
    setEditing(!!isNew);
    onCancel();
  };
  return {
    value,
    dirty,
    editing,
    setEditing,
    advanced,
    setAdvanced,
    errors,
    saveError,
    change,
    changeValue,
    submit,
    cancel,
  };
};
