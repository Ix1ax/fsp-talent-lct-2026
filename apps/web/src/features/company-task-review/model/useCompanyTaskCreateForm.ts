import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useUnsavedGuard } from '@/shared/hooks';
import { useRemoteData } from '@/shared/hooks/useRemoteData';
import { toast } from '@/shared/ui';
import { getClientCatalogs } from '@/entities/catalog';
import { type CompanyTask, createCompanyTask } from '@/entities/company-task';

import { type CompanyTaskFormValues, companyTaskSchema } from '../constants';
import { getTaskPublicationError } from '../lib';

export type CompanyTaskCreateFormOptions = {
  companyId: string;
  onCreated: (task: CompanyTask) => void;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
};

export const useCompanyTaskCreateForm = ({
  companyId,
  onCreated,
  onDirtyChange,
  onBusyChange,
}: CompanyTaskCreateFormOptions) => {
  const form = useForm<CompanyTaskFormValues>({
    resolver: zodResolver(companyTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      specializationId: '',
      gradeId: '',
      deadlineAt: '',
    },
  });
  const catalogs = useRemoteData(getClientCatalogs);
  const selected = useWatch({ control: form.control });
  const [error, setError] = useState('');
  const locked = useRef(false);
  const { isDirty, isSubmitting, errors } = form.formState;
  const { guard } = useUnsavedGuard(isDirty, isSubmitting);
  useEffect(() => {
    onDirtyChange(isDirty);
    return () => onDirtyChange(false);
  }, [isDirty, onDirtyChange]);
  useEffect(() => {
    onBusyChange(isSubmitting);
    return () => onBusyChange(false);
  }, [isSubmitting, onBusyChange]);

  const save = async (values: CompanyTaskFormValues) => {
    if (locked.current) return;
    locked.current = true;
    setError('');
    try {
      // Validate again: a deadline may have passed while the form was open.
      const input = companyTaskSchema.parse(values);
      const task = await createCompanyTask(companyId, {
        title: input.title,
        description: input.description || undefined,
        specializationId: input.specializationId
          ? Number(input.specializationId)
          : undefined,
        gradeId: input.gradeId ? Number(input.gradeId) : undefined,
        deadlineAt: input.deadlineAt
          ? new Date(input.deadlineAt).toISOString()
          : undefined,
        file: input.file,
      });
      form.reset();
      toast.success(
        'Задание опубликовано. Кандидаты могут отправлять решения.',
      );
      onCreated(task);
    } catch (cause) {
      setError(getTaskPublicationError(cause));
    } finally {
      locked.current = false;
    }
  };

  return { form, catalogs, selected, error, isSubmitting, errors, guard, save };
};
