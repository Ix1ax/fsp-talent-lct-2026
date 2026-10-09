'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
} from '@/shared/ui';
import type { Company, CompanyInput } from '@/entities/company';
import { VERIFICATION_LABELS } from '@/entities/company';

import { companySchema } from '../constants/companySchema';

interface CompanyProfileFormProps {
  company: Company | null;
  create?: boolean;
  pending: boolean;
  error: string;
  onSave: (input: CompanyInput, create: boolean) => Promise<Company>;
  onSaved: (company: Company) => void;
  onDirtyChange: (value: boolean) => void;
  onCancel?: () => void;
}
export const CompanyProfileForm = ({
  company,
  create = false,
  pending,
  error,
  onSave,
  onSaved,
  onDirtyChange,
  onCancel,
}: CompanyProfileFormProps) => {
  const form = useForm<CompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: create ? '' : (company?.name ?? ''),
      contactEmail: create ? '' : (company?.contactEmail ?? ''),
      description: create ? null : company?.description,
      inn: create ? null : company?.inn,
      contactUrl: create ? null : company?.contactUrl,
    },
  });
  const dirty = form.formState.isDirty;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  const readonly = !create && company?.memberRole !== 'owner';
  const fields = [
    { key: 'name', label: 'Название компании', required: true, max: 200 },
    {
      key: 'contactEmail',
      label: 'Контактный email',
      required: true,
      type: 'email',
      max: 254,
    },
    { key: 'inn', label: 'ИНН', max: 12 },
    {
      key: 'contactUrl',
      label: 'Сайт или контактная ссылка',
      type: 'url',
      max: 2048,
    },
  ] as const;
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>
          {create ? 'Создание компании' : 'Редактирование компании'}
        </CardTitle>
        <CardDescription>
          {readonly
            ? 'Изменять профиль может владелец компании.'
            : 'Расскажите о компании и укажите контакты для связи.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-5"
          aria-busy={pending}
          onSubmit={form.handleSubmit(async (input) => {
            try {
              const savedCompany = await onSave(input, create);
              form.reset(input);
              onDirtyChange(false);
              onSaved(savedCompany);
            } catch {
              /* Keep the draft on error. */
            }
          })}
        >
          {!create && (
            <p className="text-sm text-muted-foreground">
              Проверка компании:{' '}
              {VERIFICATION_LABELS[company?.verificationStatus ?? ''] ??
                'Не указана'}
            </p>
          )}
          <fieldset
            disabled={readonly || pending}
            className="grid gap-5 sm:grid-cols-2"
          >
            {fields.map((field) => (
              <label key={field.key} className="grid gap-2 text-sm font-medium">
                {field.label}
                {'required' in field && field.required ? ' *' : ''}
                <Input
                  {...form.register(field.key)}
                  type={'type' in field ? field.type : 'text'}
                  maxLength={field.max}
                  className="min-h-11"
                  aria-invalid={!!form.formState.errors[field.key]}
                />
                {form.formState.errors[field.key] && (
                  <span role="alert" className="font-normal text-destructive">
                    {form.formState.errors[field.key]?.message}
                  </span>
                )}
              </label>
            ))}
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              Описание
              <Textarea
                {...form.register('description')}
                maxLength={10000}
                rows={5}
                aria-invalid={!!form.formState.errors.description}
              />
              {form.formState.errors.description && (
                <span role="alert" className="text-destructive">
                  {form.formState.errors.description.message}
                </span>
              )}
            </label>
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {!readonly && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="submit"
                size="lg"
                disabled={pending}
                className="w-full sm:w-auto sm:justify-self-start"
              >
                {pending
                  ? 'Сохраняем…'
                  : create
                    ? 'Создать компанию и продолжить'
                    : 'Сохранить изменения'}
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={pending}
                  onClick={onCancel}
                >
                  Отмена
                </Button>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
