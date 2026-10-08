import { useEffect, useId, useRef, useState } from 'react';

import { ApiError, ensureClientAccessToken } from '@/shared/api';
import { useUnsavedChanges } from '@/shared/hooks';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@/shared/ui';
import {
  type CandidateEducation,
  type CandidateExperience,
  type CandidateSkill,
  getCandidateEducations,
  getCandidateExperiences,
  importCandidateResume,
  type ResumeImportResult,
} from '@/entities/candidate';
import type { CatalogItem } from '@/entities/catalog';

import {
  getImportRetryAt,
  getResumeChanges,
  getResumeFormPatches,
  getResumeImportError,
} from '../lib';
import {
  type AppliedResume,
  RESUME_MAX_BYTES,
  type ResumeCurrentDraft,
  type ResumeFieldChange,
} from '../model';
import { ResumeImportReview } from './ResumeImportReview';

type Review = {
  result: ResumeImportResult;
  experience: CandidateExperience[];
  education: CandidateEducation[];
  changes: ResumeFieldChange[];
};
interface ResumeImportCardProps {
  processing: boolean;
  profileId?: string;
  skills: CandidateSkill[];
  workFormats?: CatalogItem[];
  busy: boolean;
  applied?: AppliedResume;
  getCurrentDraft: () => ResumeCurrentDraft;
  onBusyChange: (busy: boolean) => void;
  onConsentRequired: () => Promise<void>;
  onGoToConsents: () => void;
  onApply: (resume: AppliedResume) => void;
}

export const ResumeImportCard = (props: ResumeImportCardProps) => {
  const id = useId();
  const [file, setFile] = useState<File>();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<ResumeImportResult>();
  const [review, setReview] = useState<Review>();
  const [retryAt, setRetryAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [uploading, setUploading] = useState(false);
  const running = useRef(false);
  const request = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const uploadButton = useRef<HTMLButtonElement>(null);

  useUnsavedChanges(!!props.applied || !!pending);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const update = () =>
      setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    update();
    if (!retryAt) return;
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);

  const upload = async () => {
    if (
      !file ||
      !props.processing ||
      props.busy ||
      running.current ||
      remaining > 0
    )
      return;
    if (file.size > RESUME_MAX_BYTES) {
      setMessage('Размер PDF должен быть не больше 5 МиБ.');
      return;
    }
    running.current = true;
    setUploading(true);
    props.onBusyChange(true);
    setMessage('');
    const controller = new AbortController();
    request.current = controller;
    try {
      await ensureClientAccessToken();
      const result =
        pending ?? (await importCandidateResume(file, controller.signal));
      if (controller.signal.aborted) return;
      // Retain the parse result if fetching existing lists fails; retry only those GETs.
      setPending(result);
      const [experience, education] = props.profileId
        ? await Promise.all([
            getCandidateExperiences(controller.signal),
            getCandidateEducations(controller.signal),
          ])
        : [{ items: [] }, { items: [] }];
      if (controller.signal.aborted) return;
      setReview({
        result,
        experience: experience.items,
        education: education.items,
        changes: getResumeChanges(result.draft, props.getCurrentDraft()),
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      setMessage(getResumeImportError(error));
      if (error instanceof ApiError && error.code === 'import_busy')
        setRetryAt(getImportRetryAt(error.retryAfter));
      if (error instanceof ApiError && error.code === 'consent_required') {
        try {
          await props.onConsentRequired();
        } catch {
          setMessage(
            'Импорт требует согласия. Не удалось обновить согласия — повторите загрузку данных.',
          );
        }
      }
    } finally {
      running.current = false;
      setUploading(false);
      props.onBusyChange(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Импорт резюме с hh.ru</CardTitle>
        <CardDescription>
          Загрузите PDF с текстовым слоем: до 5 МиБ и 10 страниц. Проверьте
          распознанные данные перед сохранением.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!props.processing && (
          <div className="flex flex-col gap-2">
            <p>
              Для импорта дайте согласие на обработку данных. Профиль заранее
              создавать не нужно.
            </p>
            <Button
              variant="outline"
              disabled={props.busy}
              className="self-start"
              onClick={props.onGoToConsents}
            >
              Перейти к согласиям
            </Button>
          </div>
        )}
        <label htmlFor={id} className="text-sm font-medium">
          PDF резюме
        </label>
        <Input
          ref={input}
          id={id}
          type="file"
          accept=".pdf,application/pdf"
          disabled={props.busy || !props.processing}
          onChange={(event) => {
            const next = event.target.files?.[0];
            setFile(next);
            setPending(undefined);
            setMessage(
              next && next.size > RESUME_MAX_BYTES
                ? 'Размер PDF должен быть не больше 5 МиБ.'
                : '',
            );
          }}
        />
        {message && (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}
        {remaining > 0 && (
          <p role="status" className="text-sm">
            Повторная попытка через {remaining} с.
          </p>
        )}
        <Button
          ref={uploadButton}
          disabled={
            props.busy ||
            !props.processing ||
            !file ||
            file.size > RESUME_MAX_BYTES ||
            remaining > 0
          }
          className="self-start"
          onClick={() => void upload()}
        >
          {uploading ? 'Разбор резюме…' : 'Проверить и импортировать'}
        </Button>
        <p className="text-sm text-muted-foreground">
          Импорт не сохраняет PDF или данные. Черновики живут на этой странице
          до её закрытия.
        </p>
        {props.applied && (
          <div className="flex flex-col gap-3">
            <p role="status">
              Данные применены к черновикам. Проверьте их на шагах «Профиль»,
              «Контакты», «Опыт работы», «Образование» и «Навыки».
            </p>
            {props.applied.result.warnings.length > 0 && (
              <div>
                <h3 className="font-medium">Предупреждения</h3>
                <ul className="list-disc space-y-1 pl-5">
                  {props.applied.result.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            {props.applied.result.draft.languages.length > 0 && (
              <div>
                <h3 className="font-medium">Языки из резюме</h3>
                <ul>
                  {props.applied.result.draft.languages.map(
                    (language, index) => (
                      <li key={index}>
                        {language.name} — {language.level}
                      </li>
                    ),
                  )}
                </ul>
                <p className="mt-2 text-sm text-muted-foreground">
                  Языки остаются в черновике. API для их сохранения пока не
                  предоставлен.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      {review && (
        <ResumeImportReview
          {...review}
          skills={props.skills}
          workFormats={props.workFormats}
          replacingDraft={!!props.applied}
          processing={props.processing}
          onRestoreFocus={() => {
            if (uploadButton.current && !uploadButton.current.disabled)
              uploadButton.current.focus();
            else input.current?.focus();
          }}
          onClose={() => {
            setReview(undefined);
            setPending(undefined);
          }}
          onApply={() => {
            if (!props.processing) return;
            const importId = crypto.randomUUID();
            const patches = getResumeFormPatches(review.result.draft);
            props.onApply({
              id: importId,
              result: review.result,
              profile: { id: importId, values: patches.profile },
              contacts: { id: importId, values: patches.contacts },
            });
            setReview(undefined);
            setPending(undefined);
            setFile(undefined);
            if (input.current) input.current.value = '';
          }}
        />
      )}
    </Card>
  );
};
