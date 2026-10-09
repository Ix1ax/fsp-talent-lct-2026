'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  OptionSelect,
  SalaryRangeInput,
  Textarea,
} from '@/shared/ui';
import type { Catalogs, Skill } from '@/entities/catalog';
import type { NeedInput, NeedStatus } from '@/entities/employer-need';
import { NEED_DETAIL_STATUS_LABELS } from '@/entities/employer-need';

import { toNeedInput, validateNeed } from '../lib';
import { loadNeedSkills, useNeedSkills } from '../model/useNeedSkills';
import { NeedAdvancedFields } from './NeedAdvancedFields';
import { NeedSummary } from './NeedSummary';

const STEPS = [
  { id: 'role', title: 'Роль и задачи' },
  { id: 'conditions', title: 'Условия работы' },
  { id: 'skills', title: 'Навыки' },
  { id: 'readiness', title: 'Готовность' },
] as const;
interface NeedFlowEditorProps {
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
}
export const NeedFlowEditor = ({
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
}: NeedFlowEditorProps) => {
  const form = useForm<NeedInput>({ defaultValues: toNeedInput(initial) });
  const value = useWatch({ control: form.control }) as NeedInput;
  const [step, setStep] = useState(initialStep);
  const stepNavigationRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const navigation = stepNavigationRef.current;
    if (navigation && !navigation.closest('[hidden]'))
      navigation.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, [step]);
  const [q, setQ] = useState('');
  const skillSearch = useNeedSkills(
    loadNeedSkills,
    q,
    value.skills.map((item) => item.skillId),
  );
  const skills = [
    ...new Map(
      [...initialSkills, ...skillSearch.skills].map((skill) => [
        skill.id,
        skill,
      ]),
    ).values(),
  ];
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const dirty = form.formState.isDirty;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  const change = (patch: Partial<NeedInput>) => {
    for (const key of Object.keys(patch) as (keyof NeedInput)[])
      if (patch[key] !== undefined)
        form.setValue(key, patch[key], { shouldDirty: true });
    setSaved(false);
  };
  const submit = async (status: NeedStatus, advance = false) => {
    if (pending || readonly) return;
    const next = toNeedInput({
      ...value,
      title: value.title.trim(),
      description: value.description.trim(),
      city: value.city?.trim() || null,
      timezone: value.timezone?.trim() || null,
      status,
    });
    const validation = validateNeed(next, status);
    setErrors(validation);
    if (Object.keys(validation).length) {
      if (
        validation.title ||
        validation.description ||
        validation.specializationId ||
        validation.gradeId
      )
        setStep(0);
      else if (
        validation.salaryFromRub ||
        validation.salaryToRub ||
        validation.city ||
        validation.timezone ||
        validation.workFormatIds
      )
        setStep(1);
      else setStep(2);
      return;
    }
    try {
      await onSave(next);
      form.reset(next);
      setSaved(true);
      onDirtyChange(false);
      if (advance) setStep(Math.min(3, step + 1));
    } catch {
      /* Parent displays the API error. */
    }
  };
  const message = (key: string) =>
    errors[key] && (
      <p role="alert" className="text-sm text-destructive">
        {errors[key]}
      </p>
    );
  return (
    <div className="grid gap-5">
      <Button
        variant="ghost"
        className="justify-self-start"
        disabled={pending}
        onClick={onBack}
      >
        <ArrowLeftIcon />
        Потребности
      </Button>
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
            className="hidden gap-1 sm:grid sm:grid-cols-4"
          >
            {STEPS.map((item, i) => (
              <Button
                type="button"
                key={item.id}
                variant="ghost"
                disabled={pending}
                aria-current={step === i ? 'step' : undefined}
                className={cn(
                  'h-auto min-h-11 justify-start whitespace-normal text-left',
                  step === i && 'bg-accent text-brand-text',
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
                        className="min-h-11"
                      />
                      {message('title')}
                    </label>
                    <label className="grid gap-2 text-sm font-medium">
                      Специализация *
                      <OptionSelect
                        aria-label="Специализация потребности"
                        disabled={readonly || pending}
                        value={value.specializationId}
                        onValueChange={(value) =>
                          change({ specializationId: Number(value) })
                        }
                        aria-invalid={!!errors.specializationId}
                        options={[
                          { value: 0, label: 'Выберите специализацию' },
                          ...(value.specializationId > 0 &&
                          !catalogs.specializations.some(
                            (item) => item.id === value.specializationId,
                          )
                            ? [
                                {
                                  value: value.specializationId,
                                  label: `Сохранённая специализация #${value.specializationId}`,
                                },
                              ]
                            : []),
                          ...catalogs.specializations.map((item) => ({
                            value: item.id,
                            label: item.name,
                          })),
                        ]}
                      />
                      {message('specializationId')}
                    </label>
                    <label className="grid gap-2 text-sm font-medium">
                      Грейд
                      <OptionSelect
                        aria-label="Грейд потребности"
                        disabled={readonly || pending}
                        value={value.gradeId ?? ''}
                        onValueChange={(value) =>
                          change({
                            gradeId: value ? Number(value) : null,
                          })
                        }
                        options={[
                          { value: '', label: 'Любой грейд' },
                          ...(value.gradeId !== null &&
                          !catalogs.grades.some(
                            (item) => item.id === value.gradeId,
                          )
                            ? [
                                {
                                  value: value.gradeId,
                                  label: `Сохранённый грейд #${value.gradeId}`,
                                },
                              ]
                            : []),
                          ...catalogs.grades.map((item) => ({
                            value: item.id,
                            label: item.name,
                          })),
                        ]}
                      />
                      {message('gradeId')}
                    </label>
                    <label className="grid gap-2 text-sm font-medium">
                      Задачи и описание *
                      <Textarea
                        value={value.description}
                        maxLength={10000}
                        rows={6}
                        onChange={(e) =>
                          change({ description: e.target.value })
                        }
                        aria-invalid={!!errors.description}
                      />
                      {message('description')}
                    </label>
                  </>
                )}
                {step === 1 && (
                  <>
                    <div className="grid gap-3">
                      <p className="text-sm font-medium">Зарплата в месяц, ₽</p>
                      <SalaryRangeInput
                        from={value.salaryFromRub}
                        to={value.salaryToRub}
                        onChange={({ from, to }) =>
                          change({ salaryFromRub: from, salaryToRub: to })
                        }
                        errors={{
                          from: errors.salaryFromRub,
                          to: errors.salaryToRub,
                        }}
                      />
                    </div>
                    <div className="grid gap-3">
                      <p className="text-sm font-medium">Форматы работы</p>
                      {[
                        ...catalogs.workFormats,
                        ...value.workFormatIds
                          .filter(
                            (id) =>
                              !catalogs.workFormats.some((f) => f.id === id),
                          )
                          .map((id) => ({
                            id,
                            code: '',
                            name: `Сохранённый формат #${id}`,
                          })),
                      ].map((format) => (
                        <label
                          key={format.id}
                          className="flex min-h-11 items-center gap-3 text-sm"
                        >
                          <Checkbox
                            checked={value.workFormatIds.includes(format.id)}
                            disabled={
                              !value.workFormatIds.includes(format.id) &&
                              value.workFormatIds.length >= 10
                            }
                            onCheckedChange={(checked) =>
                              change({
                                workFormatIds: checked
                                  ? [...value.workFormatIds, format.id]
                                  : value.workFormatIds.filter(
                                      (id) => id !== format.id,
                                    ),
                              })
                            }
                          />
                          {format.name}
                        </label>
                      ))}
                      {message('workFormatIds')}
                    </div>
                    <NeedAdvancedFields
                      value={{ ...value, skills: [] }}
                      skills={skills}
                      errors={errors}
                      change={change}
                    />
                  </>
                )}
                {step === 2 && (
                  <>
                    <label className="grid gap-2 text-sm font-medium">
                      Поиск навыка
                      <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Название или синоним"
                      />
                    </label>
                    {skillSearch.loading && (
                      <p role="status">Загрузка навыков…</p>
                    )}
                    {skillSearch.error && (
                      <div role="alert">
                        <p>{skillSearch.error}</p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={skillSearch.retry}
                        >
                          Повторить загрузку навыков
                        </Button>
                      </div>
                    )}
                    <div className="grid max-h-72 gap-2 overflow-y-auto">
                      {skillSearch.items.map((skill) => (
                        <label
                          key={skill.id}
                          className="flex min-h-11 items-center gap-3 text-sm"
                        >
                          <Checkbox
                            checked={value.skills.some(
                              (s) => s.skillId === skill.id,
                            )}
                            disabled={
                              value.skills.length >= 50 &&
                              !value.skills.some((s) => s.skillId === skill.id)
                            }
                            onCheckedChange={(checked) =>
                              change({
                                skills: checked
                                  ? [
                                      ...value.skills,
                                      {
                                        skillId: skill.id,
                                        required: true,
                                        weight: 1,
                                      },
                                    ]
                                  : value.skills.filter(
                                      (s) => s.skillId !== skill.id,
                                    ),
                              })
                            }
                          />
                          {skill.name}
                        </label>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Выбрано {value.skills.length} из 50 навыков. Обязательные
                      навыки сильнее влияют на подбор.
                    </p>
                    {message('skills')}
                    <NeedAdvancedFields
                      skillsOnly
                      value={value}
                      skills={skills}
                      errors={errors}
                      change={(patch) => {
                        if (patch.skills) change({ skills: patch.skills });
                      }}
                    />
                    {value.skills.map(
                      (s) =>
                        !skills.some((item) => item.id === s.skillId) && (
                          <div
                            key={s.skillId}
                            className="flex items-center gap-3 text-sm"
                          >
                            <span className="break-all">
                              Сохранённый навык: {s.skillId}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() =>
                                change({
                                  skills: value.skills.filter(
                                    (item) => item.skillId !== s.skillId,
                                  ),
                                })
                              }
                            >
                              Убрать
                            </Button>
                          </div>
                        ),
                    )}
                  </>
                )}
                {step === 3 && (
                  <>
                    <NeedSummary
                      value={value}
                      catalogs={catalogs}
                      skills={skills}
                    />
                    <p className="whitespace-pre-wrap text-sm">
                      {value.description}
                    </p>
                    <ul className="grid gap-2">
                      {Object.entries(validateNeed(value, 'active')).map(
                        ([key, text]) => (
                          <li
                            key={key}
                            className="text-sm text-muted-foreground"
                          >
                            {text}
                          </li>
                        ),
                      )}
                    </ul>
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
                      : step < 3
                        ? 'Сохранить и продолжить'
                        : 'Сохранить'}
                  </Button>
                  {step === 3 && value.status === 'draft' && !isNew && (
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
        <div className="flex flex-wrap justify-between gap-3 border-t pt-5">
          {step > 0 && (
            <Button
              variant="ghost"
              size="lg"
              disabled={pending}
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeftIcon />
              Назад
            </Button>
          )}
          {step < 3 && (
            <Button
              variant="outline"
              size="lg"
              disabled={pending}
              className="ml-auto"
              onClick={() => setStep(step + 1)}
            >
              {readonly ? 'Продолжить' : 'Продолжить без сохранения'}
              <ArrowRightIcon />
            </Button>
          )}
        </div>
        {!readonly && step < 3 && (
          <p className="text-center text-sm text-muted-foreground">
            Изменения отправляются после нажатия «Сохранить». Без сохранения они
            остаются в черновике этой страницы.
          </p>
        )}
      </div>
    </div>
  );
};
