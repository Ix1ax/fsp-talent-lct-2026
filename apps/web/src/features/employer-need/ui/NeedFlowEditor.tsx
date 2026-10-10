'use client';

import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  OptionSelect,
  Textarea,
} from '@/shared/ui';
import type { Catalogs, Skill } from '@/entities/catalog';
import type { NeedInput } from '@/entities/employer-need';
import { NEED_DETAIL_STATUS_LABELS } from '@/entities/employer-need';

import { validateNeed } from '../lib';
import { NEED_FLOW_LAST_STEP, useNeedFlowEditor } from '../model';
import { BriefPhrase } from './BriefPhrase';
import { NeedAdvancedFields } from './NeedAdvancedFields';
import { NeedReadiness } from './NeedReadiness';
import { NeedSummary } from './NeedSummary';

const STEPS = [
  { id: 'brief', title: 'Бриф' },
  { id: 'conditions', title: 'Задачи и условия' },
  { id: 'readiness', title: 'Готовность' },
] as const;
const LAST_STEP = NEED_FLOW_LAST_STEP;
interface NeedFlowEditorProps {
  active?: boolean;
  initial: NeedInput;
  catalogs: Catalogs;
  skills: Skill[];
  isNew?: boolean;
  initialStep?: number;
  readonly?: boolean;
  pending: boolean;
  error?: string;
  onSave: (value: NeedInput) => Promise<void>;
  onBack: () => void;
  onDirtyChange: (value: boolean) => void;
  /** Кнопка «Потребности» над редактором; на экране потребности назад ведёт сводка. */
  showBack?: boolean;
}
export const NeedFlowEditor = ({
  active = true,
  initial,
  catalogs,
  skills: initialSkills,
  isNew,
  initialStep = 0,
  readonly,
  pending,
  error,
  onSave,
  onBack,
  onDirtyChange,
  showBack = true,
}: NeedFlowEditorProps) => {
  const {
    value,
    step,
    setStep,
    stepNavigationRef,
    q,
    setQ,
    skillSearch,
    skills,
    errors,
    saved,
    change,
    submit,
  } = useNeedFlowEditor({
    initial,
    initialSkills,
    initialStep,
    active,
    pending,
    readonly,
    onSave,
    onDirtyChange,
  });
  const message = (key: string) =>
    errors[key] && (
      <p role="alert" className="text-sm text-destructive">
        {errors[key]}
      </p>
    );
  return (
    <div className="grid gap-5">
      {showBack && (
        <Button
          variant="ghost"
          className="justify-self-start"
          disabled={pending}
          onClick={onBack}
        >
          <ArrowLeftIcon />
          Потребности
        </Button>
      )}
      <div className="grid gap-5">
        <div
          ref={stepNavigationRef}
          className="flex scroll-mt-40 flex-col lg:scroll-mt-24 gap-3"
        >
          <p className="text-sm font-medium" aria-live="polite">
            Шаг {step + 1} из {STEPS.length} · {STEPS[step].title}
          </p>
          <OptionSelect
            aria-label="Перейти к шагу потребности"
            className="sm:hidden"
            disabled={pending}
            value={step}
            onValueChange={(value) => setStep(Number(value))}
            options={STEPS.map((item, i) => ({
              value: i,
              label: `${i + 1}. ${item.title}`,
            }))}
          />
          <nav
            aria-label="Разделы потребности"
            className="hidden w-fit gap-1 rounded-lg bg-hover p-1 sm:flex"
          >
            {STEPS.map((item, i) => (
              <Button
                type="button"
                key={item.id}
                variant="ghost"
                disabled={pending}
                aria-current={step === i ? 'step' : undefined}
                size="sm"
                className={cn(
                  'rounded-md px-3 text-muted-foreground hover:bg-transparent hover:text-foreground',
                  step === i &&
                    'bg-card text-foreground ring-1 ring-border hover:bg-card',
                )}
                onClick={() => setStep(i)}
              >
                {i + 1}. {item.title}
              </Button>
            ))}
          </nav>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{isNew ? 'Новая потребность' : value.title}</CardTitle>
            {!isNew && (
              <p className="text-sm font-medium text-brand-text">
                {NEED_DETAIL_STATUS_LABELS[value.status]}
              </p>
            )}
            <CardDescription>
              {readonly
                ? 'Потребность доступна для просмотра.'
                : 'Заполните потребность по разделам. Черновик можно сохранить и закончить позже.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-5"
              aria-busy={pending}
              onSubmit={(e) => {
                e.preventDefault();
                void submit(isNew ? 'draft' : value.status, true);
              }}
            >
              <fieldset disabled={readonly || pending} className="grid gap-5">
                {step === 0 && (
                  <>
                    <label className="grid gap-2 text-sm font-medium">
                      Название потребности *
                      <Input
                        value={value.title}
                        maxLength={200}
                        onChange={(e) => change({ title: e.target.value })}
                        aria-invalid={!!errors.title}
                        placeholder="Например, Frontend-разработчик в команду платформы"
                      />
                      {message('title')}
                    </label>
                    <div className="grid gap-2">
                      <p className="text-sm font-medium">Кого ищем</p>
                      <BriefPhrase
                        value={value}
                        onChange={(next) => change(next)}
                        catalogs={catalogs}
                        skills={skills}
                        searchItems={skillSearch.items}
                        skillQuery={q}
                        onSkillQuery={setQ}
                        skillsLoading={skillSearch.loading}
                        skillsError={skillSearch.error}
                        onRetrySkills={skillSearch.retry}
                        catalogsUnavailable={false}
                        disabled={readonly || pending}
                        errors={errors}
                      />
                      {message('specializationId')}
                      {message('gradeId')}
                      {message('workFormatIds')}
                      {message('skills')}
                    </div>
                    <NeedAdvancedFields
                      skillsOnly
                      value={value}
                      skills={skills}
                      errors={errors}
                      change={(patch) => {
                        if (patch.skills) change({ skills: patch.skills });
                      }}
                    />
                  </>
                )}
                {step === 1 && (
                  <>
                    <label className="grid gap-2 text-sm font-medium">
                      Задачи и описание *
                      <Textarea
                        value={value.description}
                        maxLength={10000}
                        rows={6}
                        placeholder="Задачи на первые месяцы, команда, продукт"
                        onChange={(e) =>
                          change({ description: e.target.value })
                        }
                        aria-invalid={!!errors.description}
                      />
                      {message('description')}
                    </label>
                    <NeedAdvancedFields
                      value={{ ...value, skills: [] }}
                      skills={skills}
                      errors={errors}
                      change={change}
                    />
                  </>
                )}
                {step === LAST_STEP && (
                  <>
                    <NeedSummary
                      value={value}
                      catalogs={catalogs}
                      skills={skills}
                    />
                    <p className="whitespace-pre-wrap text-sm">
                      {value.description}
                    </p>
                    <NeedReadiness value={value} />
                    {value.status === 'draft' &&
                      !Object.keys(validateNeed(value, 'active')).length && (
                        <p className="flex items-center gap-2 text-sm text-success">
                          <CheckIcon className="size-4" />
                          Потребность готова к активации
                        </p>
                      )}
                  </>
                )}
              </fieldset>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              {saved && (
                <p role="status" className="text-sm text-success">
                  Изменения сохранены
                </p>
              )}
              {!readonly && (
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" size="lg" disabled={pending}>
                    {pending
                      ? 'Сохраняем…'
                      : step < LAST_STEP
                        ? 'Сохранить и продолжить'
                        : 'Сохранить'}
                  </Button>
                  {step === LAST_STEP && value.status === 'draft' && !isNew && (
                    <Button
                      type="button"
                      size="lg"
                      disabled={pending}
                      onClick={() => void submit('active')}
                    >
                      Активировать потребность
                    </Button>
                  )}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
        {/* Шаги переключаются вкладками сверху; здесь — только соседний шаг. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {step > 0 ? (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeftIcon />
              Предыдущий шаг
            </Button>
          ) : (
            <span />
          )}
          {step < LAST_STEP && (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setStep(step + 1)}
            >
              {readonly ? 'Следующий шаг' : 'Пропустить шаг'}
              <ArrowRightIcon />
            </Button>
          )}
        </div>
        {!readonly && step < LAST_STEP && (
          <p className="text-xs text-muted-foreground">
            Пропущенный шаг не сохраняется на сервере: изменения остаются в
            черновике этой страницы до нажатия «Сохранить».
          </p>
        )}
      </div>
    </div>
  );
};
