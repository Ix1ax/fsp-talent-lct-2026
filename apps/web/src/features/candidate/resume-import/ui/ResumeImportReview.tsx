import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
import type {
  CandidateEducation,
  CandidateExperience,
  CandidateSkill,
  ResumeImportResult,
} from '@/entities/candidate';
import type { CatalogItem } from '@/entities/catalog';

import {
  sameResumeEducation,
  sameResumeExperience,
  sameResumeSkill,
} from '../lib';
import type { ResumeFieldChange } from '../model';

interface ResumeImportReviewProps {
  result: ResumeImportResult;
  changes: ResumeFieldChange[];
  experience: CandidateExperience[];
  education: CandidateEducation[];
  skills: CandidateSkill[];
  workFormats?: CatalogItem[];
  replacingDraft: boolean;
  processing: boolean;
  onApply: () => void;
  onClose: () => void;
}

export const ResumeImportReview = (props: ResumeImportReviewProps) => {
  const { draft, warnings } = props.result;
  const display = (value: unknown) => {
    if (Array.isArray(value))
      return (
        value
          .map(
            (id) =>
              props.workFormats?.find((format) => format.id === id)?.name ??
              `Формат ${id}`,
          )
          .join(', ') || 'Не заполнено'
      );
    return value == null || value === '' ? 'Не заполнено' : String(value);
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Проверьте результат импорта</DialogTitle>
          <DialogDescription>
            Применение заполнит черновики. Данные сохраняются только кнопками
            сохранения в соответствующих разделах.
          </DialogDescription>
        </DialogHeader>
        {props.replacingDraft && (
          <p role="alert" className="text-destructive">
            Новый импорт заменит предыдущие импортированные черновики и их
            несохранённый ввод. Уже сохранённые записи останутся в профиле.
          </p>
        )}
        {warnings.length > 0 && (
          <div>
            <h3 className="mb-2 font-medium">Предупреждения распознавания</h3>
            <ul className="list-disc space-y-2 pl-5">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        <h3 className="font-medium">Изменения профиля и контактов</h3>
        <p className="text-sm text-muted-foreground">
          Нераспознанные поля останутся без изменений. Общий стаж, статус поиска
          и часовой пояс не изменятся.
        </p>
        {props.changes.length > 0 ? (
          <dl className="flex flex-col gap-4">
            {props.changes.map((change) => (
              <div
                key={change.label}
                className="min-w-0 rounded-lg border border-border p-3 [overflow-wrap:anywhere]"
              >
                <dt className="font-medium">{change.label}</dt>
                <dd className="mt-2 whitespace-pre-wrap text-muted-foreground">
                  Сейчас: {display(change.previous)}
                </dd>
                <dd className="mt-2 whitespace-pre-wrap">
                  Из резюме: {display(change.next)}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p>Поля профиля и контактов не изменятся.</p>
        )}
        <h3 className="font-medium">
          Новые записи опыта: {draft.experience.length}
        </h3>
        <p>
          В профиле: {props.experience.length} из 30. Свободно:{' '}
          {Math.max(0, 30 - props.experience.length)}. Лишние записи останутся в
          черновике.
        </p>
        <ul className="space-y-2">
          {draft.experience.map((record, index) => (
            <li key={index} className="[overflow-wrap:anywhere]">
              {record.company || 'Компания не распознана'} ·{' '}
              {record.position || 'Должность не распознана'} ·{' '}
              {record.startedOn || '?'} —{' '}
              {record.endedOn ?? 'по настоящее время'}
              {props.experience.some((existing) =>
                sameResumeExperience(existing, record),
              ) && (
                <span className="block text-muted-foreground">
                  Похожая запись уже есть. Проверьте данные, чтобы не добавить
                  дубликат.
                </span>
              )}
            </li>
          ))}
        </ul>
        <h3 className="font-medium">
          Новые записи образования: {draft.education.length}
        </h3>
        <p>
          В профиле: {props.education.length} из 10. Свободно:{' '}
          {Math.max(0, 10 - props.education.length)}. Лишние записи останутся в
          черновике.
        </p>
        <ul className="space-y-2">
          {draft.education.map((record, index) => (
            <li key={index} className="[overflow-wrap:anywhere]">
              {record.institution || 'Учебное заведение не распознано'} ·{' '}
              {record.specialty} · {record.graduationYear ?? 'Год не распознан'}
              {props.education.some((existing) =>
                sameResumeEducation(existing, record),
              ) && (
                <span className="block text-muted-foreground">
                  Похожая запись уже есть. Проверьте данные, чтобы не добавить
                  дубликат.
                </span>
              )}
            </li>
          ))}
        </ul>
        <h3 className="font-medium">Навыки: {draft.skills.length}</h3>
        <p>
          В профиле: {props.skills.length} из 50. Существующие навыки и их
          самооценка сохранятся. Для новых навыков выберите самооценку.
        </p>
        <ul className="space-y-1">
          {draft.skills.map((skill, index) => (
            <li key={index}>
              {skill.name}
              {props.skills.some((existing) =>
                sameResumeSkill(existing, skill),
              ) && ' — уже есть в профиле'}
            </li>
          ))}
        </ul>
        {draft.languages.length > 0 && (
          <div>
            <h3 className="font-medium">Языки</h3>
            <ul>
              {draft.languages.map((language, index) => (
                <li key={index}>
                  {language.name} — {language.level}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-muted-foreground">
              Сохраним в черновике этой страницы. Запись языков в профиль пока
              недоступна.
            </p>
          </div>
        )}
        {!props.processing && (
          <p role="alert">
            Согласие на обработку больше не активно. Обновите согласия перед
            применением.
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={props.onClose}>
            Отменить импорт
          </Button>
          <Button
            type="button"
            disabled={!props.processing}
            onClick={props.onApply}
          >
            Применить к черновикам
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
