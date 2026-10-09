'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  useAsyncMutation,
  useUnsavedChanges,
  useUnsavedGuard,
} from '@/shared/hooks';
import {
  Button,
  ConfirmDiscardDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
  toast,
} from '@/shared/ui';
import type { Company } from '@/entities/company';
import type { CandidateOffer, OfferInput } from '@/entities/employer-bank';
import type { EmployerBankApi } from '@/entities/employer-bank';
import type { EmployerNeed } from '@/entities/employer-need';

import { offerSchema } from '../constants/offerSchema';

interface OfferComposerProps {
  company: Company;
  candidateId: string;
  need?: EmployerNeed;
  api: EmployerBankApi;
  onClose: () => void;
  onSent: (offer: CandidateOffer) => void;
  onBusyChange: (busy: boolean) => void;
}
export const OfferComposer = ({
  company,
  candidateId,
  need,
  api,
  onClose,
  onSent,
  onBusyChange,
}: OfferComposerProps) => {
  const mutation = useAsyncMutation();
  const [uncertain, setUncertain] = useState(false);
  const form = useForm<OfferInput>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      candidateId,
      needId: need?.id ?? null,
      title: need?.title ?? '',
      description: need?.description ?? '',
      salaryFromRub: need?.salaryFromRub ?? 0,
      salaryToRub: need?.salaryToRub ?? 0,
      contactEmail: company.contactEmail,
      contactUrl: company.contactUrl,
    },
  });
  const dirty = form.formState.isDirty;
  const unsaved = useUnsavedGuard(dirty, mutation.pending);
  useUnsavedChanges(dirty);
  useEffect(() => {
    onBusyChange(mutation.pending);
    return () => onBusyChange(false);
  }, [mutation.pending, onBusyChange]);
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) unsaved.guard(onClose);
        }}
      >
        <DialogContent
          className="max-h-[85dvh] overflow-y-auto sm:max-w-xl"
          showCloseButton={!mutation.pending}
        >
          <DialogHeader>
            <DialogTitle>Предложение кандидату</DialogTitle>
            <DialogDescription>
              {need ? `Потребность: ${need.title}. ` : ''}Укажите полные условия
              и контакты работодателя.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((input) => {
              if (uncertain) return;
              void mutation
                .run(async () => {
                  try {
                    const offer = await api.sendCandidateOffer(
                      company.id,
                      input,
                    );
                    form.reset(input);
                    onSent(offer);
                    toast.success('Предложение отправлено');
                  } catch (error) {
                    if (
                      error instanceof Error &&
                      'status' in error &&
                      error.status === 0
                    )
                      setUncertain(true);
                    throw error;
                  }
                })
                .catch(() => {});
            })}
          >
            <fieldset
              disabled={mutation.pending || uncertain}
              className="grid gap-4"
            >
              <label className="grid gap-2 text-sm">
                Название *
                <Input
                  {...form.register('title')}
                  maxLength={200}
                  aria-invalid={!!form.formState.errors.title}
                />
                {form.formState.errors.title && (
                  <span role="alert" className="text-destructive">
                    {form.formState.errors.title.message}
                  </span>
                )}
              </label>
              <label className="grid gap-2 text-sm">
                Условия предложения *
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
              <div className="grid gap-4 sm:grid-cols-2">
                {(['salaryFromRub', 'salaryToRub'] as const).map((key) => (
                  <label key={key} className="grid gap-2 text-sm">
                    {key === 'salaryFromRub'
                      ? 'Зарплата от, ₽ *'
                      : 'Зарплата до, ₽ *'}
                    <Input
                      type="number"
                      min={1}
                      max={1000000000}
                      step={1}
                      {...form.register(key, { valueAsNumber: true })}
                      aria-invalid={!!form.formState.errors[key]}
                    />
                    {form.formState.errors[key] && (
                      <span role="alert" className="text-destructive">
                        {form.formState.errors[key]?.message}
                      </span>
                    )}
                  </label>
                ))}
              </div>
              <label className="grid gap-2 text-sm">
                Email работодателя *
                <Input
                  type="email"
                  {...form.register('contactEmail')}
                  maxLength={254}
                  aria-invalid={!!form.formState.errors.contactEmail}
                />
                {form.formState.errors.contactEmail && (
                  <span role="alert" className="text-destructive">
                    {form.formState.errors.contactEmail.message}
                  </span>
                )}
              </label>
              <label className="grid gap-2 text-sm">
                Контактная ссылка
                <Input
                  type="url"
                  {...form.register('contactUrl')}
                  aria-invalid={!!form.formState.errors.contactUrl}
                />
                {form.formState.errors.contactUrl && (
                  <span role="alert" className="text-destructive">
                    {form.formState.errors.contactUrl.message}
                  </span>
                )}
              </label>
            </fieldset>
            {mutation.error && (
              <p role="alert" className="text-sm text-destructive">
                {mutation.error}
              </p>
            )}
            {uncertain && (
              <p role="alert" className="text-sm text-muted-foreground">
                Ответ сервера не получен. Сначала проверьте историю предложений:
                запрос мог завершиться. Закройте форму и откройте раздел
                «Предложения».
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                size="lg"
                disabled={mutation.pending || uncertain}
              >
                {mutation.pending ? 'Отправляем…' : 'Отправить предложение'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={mutation.pending}
                onClick={() => unsaved.guard(onClose)}
              >
                Отмена
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDiscardDialog
        open={unsaved.open}
        onCancel={unsaved.cancel}
        onProceed={unsaved.proceed}
      />
    </>
  );
};
