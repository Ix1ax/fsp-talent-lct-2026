import {
  Controller,
  type UseFieldArrayReturn,
  type UseFormReturn,
} from 'react-hook-form';
import { PlusIcon, Trash2Icon } from 'lucide-react';

import { Button, Input } from '@/shared/ui';

import { type TemplateFormValues } from '../model';
import { AdminFieldGrid } from './AdminFieldGrid';
import { Field, SkillPicker } from './Common';
import { DifficultyPicker } from './QuestionKindPicker';

interface TemplateBlueprintProps {
  form: UseFormReturn<TemplateFormValues>;
  rows: UseFieldArrayReturn<TemplateFormValues, 'blueprint'>;
  questionTotal: number;
  timeLimit: number;
  passScore: number;
}
export const TemplateBlueprint = ({
  form,
  rows,
  questionTotal,
  timeLimit,
  passScore,
}: TemplateBlueprintProps) => {
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">Состав теста</h3>
        <ul
          aria-label="Сводка теста"
          className="flex flex-wrap gap-1.5 text-xs font-medium"
        >
          <li className="rounded-full bg-accent px-2.5 py-1 text-brand-text">
            {questionTotal} вопр.
          </li>
          <li className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
            {Number.isFinite(timeLimit) ? Math.round(timeLimit / 60) : '—'} мин
          </li>
          <li className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
            проходной {Number.isFinite(passScore) ? passScore : '—'}%
          </li>
        </ul>
      </div>
      {rows.fields.map((row, index) => (
        <div
          key={row.id}
          className="grid min-w-0 gap-3 rounded-xl border border-border bg-muted/30 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Блок {index + 1}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Удалить блок ${index + 1}`}
              title="Удалить блок"
              disabled={rows.fields.length <= 1}
              onClick={() => rows.remove(index)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2Icon />
            </Button>
          </div>
          <Controller
            control={form.control}
            name={`blueprint.${index}.skill_id`}
            render={({ field }) => (
              <SkillPicker
                error={
                  form.formState.errors.blueprint?.[index]?.skill_id?.message
                }
                approvedOnly
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <AdminFieldGrid className="sm:grid-cols-3">
            <Field
              label="Сложность"
              error={
                form.formState.errors.blueprint?.[index]?.difficulty?.message
              }
            >
              <Controller
                control={form.control}
                name={`blueprint.${index}.difficulty`}
                render={({ field }) => (
                  <DifficultyPicker
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </Field>
            <Field
              label="Вопросов"
              error={
                form.formState.errors.blueprint?.[index]?.question_count
                  ?.message
              }
            >
              <Input
                type="number"
                min={1}
                max={50}
                {...form.register(`blueprint.${index}.question_count`, {
                  valueAsNumber: true,
                })}
              />
            </Field>
            <Field
              label="Вес"
              error={form.formState.errors.blueprint?.[index]?.weight?.message}
            >
              <Input
                type="number"
                step="0.01"
                {...form.register(`blueprint.${index}.weight`, {
                  valueAsNumber: true,
                })}
              />
            </Field>
          </AdminFieldGrid>
        </div>
      ))}
      {(form.formState.errors.blueprint?.message ??
        form.formState.errors.blueprint?.root?.message) && (
        <p role="alert" className="text-sm text-destructive">
          {form.formState.errors.blueprint?.message ??
            form.formState.errors.blueprint?.root?.message}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        className="justify-self-start border-dashed"
        disabled={rows.fields.length >= 30}
        onClick={() =>
          rows.append({
            skill_id: '',
            difficulty: 1,
            question_count: 5,
            weight: 1,
          })
        }
      >
        <PlusIcon aria-hidden="true" />
        Добавить блок навыка
      </Button>
    </section>
  );
};
