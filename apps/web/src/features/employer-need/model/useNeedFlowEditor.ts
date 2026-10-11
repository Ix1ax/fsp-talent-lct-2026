'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { EMPLOYER_NEED_DRAFT_SCOPE, STATIC_ROUTES } from '@/shared/contants';
import { useFormUnsavedChanges } from '@/shared/hooks';
import type { Skill } from '@/entities/catalog';
import type { NeedInput, NeedStatus } from '@/entities/employer-need';

import { toNeedInput, validateNeed } from '../lib';
import { loadNeedSkills, useNeedSkills } from './useNeedSkills';

type NeedFlowEditorOptions = {
  initial: NeedInput;
  initialSkills: Skill[];
  initialStep: number;
  active: boolean;
  pending: boolean;
  readonly?: boolean;
  onSave: (value: NeedInput) => Promise<void>;
  onDirtyChange: (value: boolean) => void;
};

/** Шаги: бриф → задачи и условия → готовность. */
export const NEED_FLOW_LAST_STEP = 2;
export const useNeedFlowEditor = ({
  initial,
  initialSkills,
  initialStep,
  active,
  pending,
  readonly,
  onSave,
  onDirtyChange,
}: NeedFlowEditorOptions) => {
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
    active,
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
  const { dirty, markSaved } = useFormUnsavedChanges(form, {
    preserveWithin: useMemo(
      () => [
        STATIC_ROUTES.EMPLOYER,
        STATIC_ROUTES.EMPLOYER_PROFILE,
        STATIC_ROUTES.EMPLOYER_DOCUMENTS,
        STATIC_ROUTES.EMPLOYER_TEAM,
        STATIC_ROUTES.EMPLOYER_VACANCIES,
        STATIC_ROUTES.EMPLOYER_CANDIDATES,
        STATIC_ROUTES.EMPLOYER_OFFERS,
      ],
      [],
    ),
    scopeSearchParams: EMPLOYER_NEED_DRAFT_SCOPE,
  });
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
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
      if (validation.title || validation.specializationId || validation.gradeId)
        setStep(0);
      else if (
        validation.description ||
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
      markSaved();
      setSaved(true);
      onDirtyChange(false);
      if (advance) setStep(Math.min(NEED_FLOW_LAST_STEP, step + 1));
    } catch {
      setSaved(false);
    }
  };
  return {
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
    dirty,
    change,
    submit,
  };
};
