'use client';
import type { ReactNode } from 'react';
import { ArrowRightIcon, PencilIcon } from 'lucide-react';

import { Button, Input, Textarea } from '@/shared/ui';
import { MetaLabel } from '@/shared/ui/MetaLabel';
import type { Catalogs, Skill } from '@/entities/catalog';
import type { NeedInput } from '@/entities/employer-need';

import { getNeedSaveLabel, getNeedStatusLabel } from '../lib';
import { useNeedEditor } from '../model';
import { BriefPhrase } from './BriefPhrase';
import { NeedAdvancedFields } from './NeedAdvancedFields';
import { NeedReadiness } from './NeedReadiness';
interface NeedEditorProps {
  initial: NeedInput;
  footer?: ReactNode;
  catalogs: Catalogs;
  skills: Skill[];
  isNew?: boolean;
  readonly?: boolean;
  pending: boolean;
  error?: string;
  onSave: (value: NeedInput) => Promise<void>;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
}
export const NeedEditor = ({
  initial,
  footer,
  catalogs,
  skills,
  isNew,
  readonly,
  pending,
  error,
  onSave,
  onCancel,
  onDirtyChange,
}: NeedEditorProps) => {
  const {
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
  } = useNeedEditor({ initial, isNew, onSave, onCancel, onDirtyChange });
  const displayedError = saveError || error;
  const fieldError = (key: string) =>
    errors[key] && (
      <p id={`${key}-error`} className="text-sm text-destructive">
        {errors[key]}
      </p>
    );
  return (
    <section
      className="border border-border bg-card p-4 md:p-6 xl:px-8 xl:py-7"
      aria-label={isNew ? 'Новая потребность' : 'Бриф потребности'}
    >
      <div className="mb-5 flex items-center gap-3">
        <MetaLabel className="text-[11px] text-brand-text">
          {isNew ? 'Новая потребность' : 'Бриф потребности'}
        </MetaLabel>
        <MetaLabel className="ml-auto text-[11px] text-muted-foreground">
          {getNeedStatusLabel(value.status, readonly)}
        </MetaLabel>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(isNew ? 'draft' : value.status);
        }}
        className="flex flex-col gap-5"
        aria-busy={pending}
      >
        <fieldset disabled={readonly || pending} className="contents">
          {editing ? (
            <label className="grid gap-2 text-sm text-muted-foreground">
              Название *
              <Input
                autoFocus={isNew}
                maxLength={200}
                value={value.title}
                onChange={(e) => change({ title: e.target.value })}
                placeholder="Frontend-разработчик в команду платформы"
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? 'title-error' : undefined}
              />
              {fieldError('title')}
            </label>
          ) : (
            <h2 className="text-[22px] font-bold leading-tight tracking-tight md:text-[26px] xl:text-[30px]">
              {value.title}
            </h2>
          )}
          <BriefPhrase
            value={value}
            onChange={changeValue}
            catalogs={catalogs}
            skills={skills}
            disabled={readonly || pending}
            errors={errors}
          />
          <div className="grid gap-2" aria-live="polite">
            {fieldError('specializationId')}
            {fieldError('workFormatIds')}
            {fieldError('skills')}
            {fieldError('salaryFromRub')}
            {fieldError('salaryToRub')}
          </div>
          {(value.city || value.timezone) && (
            <p className="text-sm text-muted-foreground">
              {[value.city, value.timezone].filter(Boolean).join(' · ')}
            </p>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            {readonly
              ? 'Условия потребности доступны для просмотра.'
              : 'Нажмите на выделенное слово, чтобы изменить условия. Затем сохраните изменения.'}
          </p>
          <div className="grid gap-3 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <MetaLabel className="text-[11px]">
                Чем будет заниматься *
              </MetaLabel>
              {!readonly && !editing && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="text-brand-text"
                  onClick={() => setEditing(true)}
                >
                  <PencilIcon />
                  Изменить
                </Button>
              )}
            </div>
            {editing ? (
              <label className="grid gap-2">
                <span className="sr-only">Описание задач</span>
                <Textarea
                  value={value.description}
                  maxLength={10000}
                  onChange={(e) => change({ description: e.target.value })}
                  placeholder="Задачи на первые месяцы, команда, продукт"
                  rows={4}
                  aria-invalid={!!errors.description}
                  aria-describedby={
                    errors.description ? 'description-error' : undefined
                  }
                />
                {fieldError('description')}
              </label>
            ) : (
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                {value.description}
              </p>
            )}
          </div>
          {!readonly && (
            <Button
              type="button"
              variant="ghost"
              className="justify-start px-0 text-brand-text"
              aria-expanded={advanced}
              onClick={() => setAdvanced(!advanced)}
            >
              Дополнительные условия {advanced ? '−' : '+'}
            </Button>
          )}
          {advanced && (
            <NeedAdvancedFields
              value={value}
              skills={skills}
              errors={errors}
              change={change}
            />
          )}
        </fieldset>
        {displayedError && (
          <p role="alert" className="text-sm text-destructive">
            {displayedError}
          </p>
        )}
        {!readonly && (isNew || value.status === 'draft') && (
          <NeedReadiness value={value} />
        )}
        {!readonly &&
          (dirty || editing || isNew || value.status === 'draft') && (
            <div
              className="flex flex-wrap gap-3 border-t border-border pt-4"
              aria-label="Сохранение изменений"
            >
              <Button
                type="button"
                size="lg"
                disabled={pending}
                onClick={() =>
                  void submit(
                    isNew || value.status === 'draft' ? 'active' : value.status,
                  )
                }
                className="max-md:w-full"
              >
                {getNeedSaveLabel(value.status, pending, isNew)}
                <ArrowRightIcon />
              </Button>
              {(isNew || value.status === 'draft') && (
                <Button
                  type="submit"
                  size="lg"
                  variant="outline"
                  disabled={pending}
                  className="max-md:flex-1"
                >
                  Сохранить черновик
                </Button>
              )}
              <Button
                type="button"
                size="lg"
                variant="ghost"
                disabled={pending}
                onClick={cancel}
              >
                Отмена
              </Button>
            </div>
          )}
        {readonly && (
          <p className="text-sm text-muted-foreground">
            {value.status === 'archived'
              ? 'Потребность в архиве. Владелец или рекрутер может её восстановить.'
              : 'Изменять потребность могут владелец и рекрутер компании.'}
          </p>
        )}
      </form>
      {footer && <div className="mt-5">{footer}</div>}
    </section>
  );
};
