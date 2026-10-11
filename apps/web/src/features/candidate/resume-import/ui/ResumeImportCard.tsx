import {
  AlertCircleIcon,
  LoaderCircleIcon,
  TriangleAlertIcon,
} from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FileInput,
} from '@/shared/ui';
import { type CandidateSkill } from '@/entities/candidate';
import { type CatalogItem } from '@/entities/catalog';

import {
  type AppliedResume,
  RESUME_MAX_BYTES,
  type ResumeCurrentDraft,
  useResumeImport,
} from '../model';
import { ResumeImportReview } from './ResumeImportReview';

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
  const {
    id,
    file,
    setFile,
    message,
    setMessage,
    setPending,
    review,
    setReview,
    remaining,
    uploading,
    input,
    uploadButton,
    upload,
    handleApply,
  } = useResumeImport(props);
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
          <FileInput
            ref={input}
            id={id}
            accept=".pdf,application/pdf"
            buttonLabel="Выбрать PDF"
            fileName={file?.name ?? null}
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
