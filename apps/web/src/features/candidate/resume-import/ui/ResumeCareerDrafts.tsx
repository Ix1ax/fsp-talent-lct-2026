import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';

import { ApiError, ensureClientAccessToken } from '@/shared/api';
import { Button } from '@/shared/ui';
import {
  addCandidateEducation,
  addCandidateExperience,
  getCandidateEducations,
  getCandidateExperiences,
  type SaveCandidateEducationInput,
  type SaveCandidateExperienceInput,
} from '@/entities/candidate';

import { EducationForm } from '../../education';
import { ExperienceForm } from '../../experience';
import {
  getResumeImportError,
  sameResumeEducation,
  sameResumeExperience,
  toResumeEducationValues,
  toResumeExperienceValues,
} from '../lib';
import { type AppliedResume, useResumeRecords } from '../model';

interface ResumeCareerDraftsProps {
  resume: AppliedResume;
  kind: 'experience' | 'education';
  profileId?: string;
  active: boolean;
  revision: number;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onSaved: () => void;
}

export const ResumeCareerDrafts = (props: ResumeCareerDraftsProps) => {
  const { kind, profileId, active, revision } = props;
  const limit = kind === 'experience' ? 30 : 10;
  const [count, setCount] = useState<number>();
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const actions = useResumeRecords(props);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!profileId) return;
      try {
        await ensureClientAccessToken();
        if (signal?.aborted) return;
        setLoading(true);
        setLoadError('');
        const response =
          kind === 'experience'
            ? await getCandidateExperiences(signal)
            : await getCandidateEducations(signal);
        if (!signal?.aborted) setCount(response.items.length);
      } catch (error) {
        if (!signal?.aborted) {
          setCount(undefined);
          setLoadError(getResumeImportError(error));
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [kind, profileId],
  );
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void ensureClientAccessToken()
      .then(() => {
        if (!controller.signal.aborted) return refresh(controller.signal);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setLoadError(getResumeImportError(error));
      });
    return () => controller.abort();
  }, [active, revision, refresh]);

  const checkCapacity = (length: number) => {
    setCount(length);
    if (length >= limit)
      throw new ApiError(409, 'Limit reached', 'limit_reached');
  };
  const saveExperience = (index: number, input: SaveCandidateExperienceInput) =>
    actions.save(index, async () => {
      const current = await getCandidateExperiences();
      checkCapacity(current.items.length);
      if (current.items.some((record) => sameResumeExperience(record, input)))
        throw new Error(
          'Такое место работы уже есть. Проверьте запись или уберите её из черновика.',
        );
      const record = await addCandidateExperience(input);
      setCount(current.items.length + 1);
      return record;
    });
  const saveEducation = (index: number, input: SaveCandidateEducationInput) =>
    actions.save(index, async () => {
      const current = await getCandidateEducations();
      checkCapacity(current.items.length);
      if (current.items.some((record) => sameResumeEducation(record, input)))
        throw new Error(
          'Такое образование уже есть. Проверьте запись или уберите её из черновика.',
        );
      const record = await addCandidateEducation(input);
      setCount(current.items.length + 1);
      return record;
    });
  const disabled =
    props.busy || !profileId || loading || count == null || count >= limit;
  const renderRecord = (index: number, form: ReactNode) => {
    const status = actions.statuses[index];
    if (status?.dismissed) return null;
    if (status?.savedId)
      return (
        <p
          key={index}
          role="status"
          className="rounded-lg border border-border p-4 text-sm"
        >
          Запись {index + 1} сохранена. Повторно добавляться не будет.
          {status.error && (
            <span role="alert" className="mt-2 block text-destructive">
              {status.error}
            </span>
          )}
        </p>
      );
    return <div key={index}>{form}</div>;
  };
  const records = props.resume.result.draft[kind];
  if (!records.length) return null;
  return (
    <section
      aria-label={
        kind === 'experience' ? 'Опыт из резюме' : 'Образование из резюме'
      }
      className="mb-6 flex flex-col gap-4"
    >
      <h2 className="text-xl font-semibold">Черновики из резюме</h2>
      <p className="text-sm text-muted-foreground">
        Проверьте каждую запись перед сохранением. Существующие записи
        сохранятся.
      </p>
      {!profileId && (
        <p role="status">
          Сначала создайте профиль на шаге «Профиль». Черновики остаются здесь.
        </p>
      )}
      {profileId && (
        <p role="status" className="text-sm">
          Свободных мест:{' '}
          {count == null ? 'проверяем…' : Math.max(0, limit - count)} из {limit}
          .
        </p>
      )}
      {loadError && (
        <div className="flex flex-col gap-2">
          <p role="alert">{loadError}</p>
          <Button
            variant="outline"
            disabled={props.busy || loading}
            onClick={() => void refresh()}
          >
            Проверить доступные места
          </Button>
        </div>
      )}
      {count != null && count >= limit && (
        <p>
          Лимит достигнут. Удалите ненужную запись ниже, затем проверьте
          доступные места.
        </p>
      )}
      {profileId && count != null && (
        <Button
          variant="outline"
          disabled={props.busy || loading}
          className="self-start"
          onClick={() => void refresh()}
        >
          Проверить доступные места
        </Button>
      )}
      {kind === 'experience'
        ? props.resume.result.draft.experience.map((record, index) =>
            renderRecord(
              index,
              <ExperienceForm
                initialValues={toResumeExperienceValues(record)}
                disabled={disabled}
                busy={props.busy}
                error={actions.statuses[index]?.error}
                onSave={(input) => saveExperience(index, input)}
                onClose={() => actions.dismiss(index)}
              />,
            ),
          )
        : props.resume.result.draft.education.map((record, index) =>
            renderRecord(
              index,
              <EducationForm
                initialValues={toResumeEducationValues(record)}
                disabled={disabled}
                busy={props.busy}
                error={actions.statuses[index]?.error}
                onSave={(input) => saveEducation(index, input)}
                onClose={() => actions.dismiss(index)}
              />,
            ),
          )}
    </section>
  );
};
