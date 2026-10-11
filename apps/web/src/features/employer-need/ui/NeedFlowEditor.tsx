'use client';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui';
import { type Catalogs, type Skill } from '@/entities/catalog';
import {
  NEED_DETAIL_STATUS_LABELS,
  type NeedInput,
} from '@/entities/employer-need';

import { validateNeed } from '../lib';
import { NEED_FLOW_LAST_STEP, useNeedFlowEditor } from '../model';
import { NeedBriefStep } from './NeedBriefStep';
import { NeedConditionsStep } from './NeedConditionsStep';
import { NeedReadiness } from './NeedReadiness';
import { NeedStepNavigation } from './NeedStepNavigation';
import { NeedSummary } from './NeedSummary';

const getNeedSaveLabel = (pending: boolean, step: number) => {
  if (pending) {
    return 'Сохраняем…';
  }

  if (step < LAST_STEP) {
    return 'Сохранить и продолжить';
  }

  return 'Сохранить';
};

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
  const editor = useNeedFlowEditor({
    initial,
    initialSkills,
    initialStep,
    active,
    pending,
    readonly,
    onSave,
    onDirtyChange,
  });
  const { value, step, setStep, stepNavigationRef, skills, saved, submit } =
    editor;
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
        <NeedStepNavigation
          stepNavigationRef={stepNavigationRef}
          step={step}
          pending={pending}
          setStep={setStep}
        />
        <Card>
          <CardHeader>
            <CardTitle>{isNew ? 'Новая потребность' : value.title}</CardTitle>
            {!isNew && (
              <Badge variant="secondary">
                {NEED_DETAIL_STATUS_LABELS[value.status]}
              </Badge>
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
                  <NeedBriefStep
                    editor={editor}
                    catalogs={catalogs}
                    readonly={readonly}
                    pending={pending}
                  />
                )}
                {step === 1 && <NeedConditionsStep editor={editor} />}
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
                  <Button
                    type="submit"
                    variant={
                      step === LAST_STEP && value.status === 'draft' && !isNew
                        ? 'outline'
                        : 'default'
                    }
                    disabled={pending}
                  >
                    {getNeedSaveLabel(pending, step)}
                  </Button>
                  {step === LAST_STEP && value.status === 'draft' && !isNew && (
                    <Button
                      type="button"
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
