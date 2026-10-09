import { useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircleIcon,
  LoaderCircleIcon,
  TriangleAlertIcon,
} from 'lucide-react';

import { ApiError, ensureClientAccessToken } from '@/shared/api';
import { CANDIDATE_DRAFT_ROUTES } from '@/shared/contants';
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

  useUnsavedChanges(!!file || !!pending, {
    preserveWithin: CANDIDATE_DRAFT_ROUTES,
  });

  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    const update = () => {
      setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    };
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
    ) {
      return;
    }

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
      if (controller.signal.aborted) return;

      const result =
        pending ?? (await importCandidateResume(file, controller.signal));
      if (controller.signal.aborted) return;
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
          if (controller.signal.aborted) return;
          setMessage(
            'Импорт требует согласия. Не удалось обновить согласия — повторите загрузку данных.',
          );
        }
      }
    } finally {
      running.current = false;
      request.current = null;
      setUploading(false);
      props.onBusyChange(false);
    }
  };

  const handleApply = () => {
    if (!props.processing || !review) return;
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
        <div
          className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center sm:px-8"
          aria-busy={uploading}
        >
          <label htmlFor={id} className="text-base font-medium">
            Выберите файл резюме
          </label>
          <Input
            ref={input}
            id={id}
            type="file"
            accept=".pdf,application/pdf"
            disabled={props.busy || !props.processing}
            className="w-full max-w-xl text-left"
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
          <Button
            ref={uploadButton}
            disabled={
              props.busy ||
              !props.processing ||
              !file ||
              file.size > RESUME_MAX_BYTES ||
              remaining > 0
            }
            className="self-center"
            onClick={() => void upload()}
          >
            {uploading ? (
              <>
                <LoaderCircleIcon
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                Разбираем резюме…
              </>
            ) : (
              'Проверить и импортировать'
            )}
          </Button>
          <p className="max-w-xl text-sm text-muted-foreground">
            PDF с текстовым слоем, до 5 МиБ и 10 страниц. Импорт не сохраняет
            файл; черновики доступны, пока открыта эта страница.
          </p>
        </div>
        {message && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          >
            <AlertCircleIcon
              className="mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            <p>{message}</p>
          </div>
        )}
        {remaining > 0 && (
          <p role="status" className="text-sm">
            Повторная попытка через {remaining} с.
          </p>
        )}
        {props.applied && (
          <div className="flex flex-col gap-3">
            <p role="status">
              Данные применены к черновикам. Проверьте их на шагах «Профиль»,
              «Контакты», «Опыт работы», «Образование» и «Навыки».
            </p>
            {props.applied.result.warnings.length > 0 && (
              <div
                role="status"
                className="rounded-lg border border-warning/30 bg-warning-soft p-4"
              >
                <h3 className="flex items-center gap-2 font-medium text-warning">
                  <TriangleAlertIcon
                    className="size-5 shrink-0"
                    aria-hidden="true"
                  />
                  Предупреждения импорта
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-7 text-sm leading-relaxed">
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
          onApply={handleApply}
        />
      )}
    </Card>
  );
};
