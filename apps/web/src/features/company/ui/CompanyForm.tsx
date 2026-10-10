'use client';

import { useForm, useWatch } from 'react-hook-form';

import { getApiErrorMessage } from '@/shared/api';
import { useFormUnsavedChanges } from '@/shared/hooks';
import { toast } from '@/shared/ui';
import {
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@/shared/ui';
import type { Company, CompanyInput } from '@/entities/company';

interface CompanyFormProps {
  company: Company | null;
  create: boolean;
  open: boolean;
  pending: boolean;
  error: string;
  onOpenChange: (open: boolean) => void;
  onSave: (input: CompanyInput, create: boolean) => Promise<void>;
}

export const CompanyForm = ({
  company,
  create,
  open,
  pending,
  error,
  onOpenChange,
  onSave,
}: CompanyFormProps) => {
  const form = useForm<CompanyInput>({
    defaultValues: {
      name: create ? '' : (company?.name ?? ''),
      contactEmail: create ? '' : (company?.contactEmail ?? ''),
      description: create ? null : (company?.description ?? null),
      inn: create ? null : (company?.inn ?? null),
      contactUrl: create ? null : (company?.contactUrl ?? null),
    },
  });
  const value = useWatch({ control: form.control }) as CompanyInput;

  const readonly = !create && company?.memberRole !== 'owner';
  const change = (patch: Partial<CompanyInput>) => {
    for (const key of Object.keys(patch) as (keyof CompanyInput)[])
      form.setValue(key, patch[key], { shouldDirty: true });
  };
  const unsaved = useFormUnsavedChanges(form);
  const close = (v: boolean) => {
    if (pending) return;
    if (!v) unsaved.discard(() => onOpenChange(false));
    else onOpenChange(v);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={close}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-115">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold">
              {create ? 'Новая компания' : 'Профиль компании'}
            </SheetTitle>
            <SheetDescription>
              {readonly
                ? 'Профиль компании доступен для просмотра. Изменять его может владелец.'
                : 'Название и контактная почта обязательны.'}
            </SheetDescription>
          </SheetHeader>
          <form
            className="grid gap-4 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void onSave(
                {
                  ...value,
                  name: value.name.trim(),
                  contactEmail: value.contactEmail.trim(),
                },
                create,
              )
                .then(() => {
                  form.reset(value);
                  unsaved.markSaved();
                  onOpenChange(false);
                })
                .catch((error: unknown) => {
                  toast.error(getApiErrorMessage(error));
                });
            }}
            aria-busy={pending}
          >
            <fieldset disabled={readonly || pending} className="contents">
              <label className="grid gap-2 text-sm">
                Название *
                <Input
                  required
                  maxLength={200}
                  value={value.name}
                  onChange={(e) => change({ name: e.target.value })}
                />
              </label>
              <label className="grid gap-2 text-sm">
                Контактный email *
                <Input
                  type="email"
                  required
                  maxLength={254}
                  value={value.contactEmail}
                  onChange={(e) => change({ contactEmail: e.target.value })}
                />
              </label>
              <label className="grid gap-2 text-sm">
                Описание
                <Textarea
                  value={value.description ?? ''}
                  onChange={(e) =>
                    change({ description: e.target.value || null })
                  }
                />
              </label>
              <label className="grid gap-2 text-sm">
                ИНН
                <Input
                  value={value.inn ?? ''}
                  onChange={(e) => change({ inn: e.target.value || null })}
                />
              </label>
              <label className="grid gap-2 text-sm">
                Сайт или контактная ссылка
                <Input
                  type="url"
                  value={value.contactUrl ?? ''}
                  onChange={(e) =>
                    change({ contactUrl: e.target.value || null })
                  }
                />
              </label>
            </fieldset>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {!readonly && (
              <Button type="submit" disabled={pending}>
                {pending
                  ? 'Сохраняем…'
                  : create
                    ? 'Создать компанию'
                    : 'Сохранить'}
              </Button>
            )}
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
};
