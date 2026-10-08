import { useRef, useState } from 'react';
import { PlusIcon } from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDeleteDialog,
} from '@/shared/ui';
import type { CandidateExperience } from '@/entities/candidate';

import { EXPERIENCE_LIMIT } from '../constants';
import { useCandidateExperience } from '../model';
import { ExperienceForm } from './ExperienceForm';
import { ExperienceItem } from './ExperienceItem';

interface CandidateExperienceCardProps {
  profileId?: string;
  active: boolean;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onCountChange: (count: number) => void;
  onGoToProfile: () => void;
}

export const CandidateExperienceCard = (
  props: CandidateExperienceCardProps,
) => {
  const actions = useCandidateExperience(props);
  const [editor, setEditor] = useState<{ record?: CandidateExperience }>();
  const [deleting, setDeleting] = useState<CandidateExperience>();
  const addButton = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const disabled =
    props.busy ||
    actions.loading ||
    actions.stale ||
    actions.profileMissing ||
    !actions.items;
  const restoreFocus = () =>
    requestAnimationFrame(() => {
      if (addButton.current?.disabled)
        list.current
          ?.querySelector<HTMLButtonElement>('button:not(:disabled)')
          ?.focus();
      else addButton.current?.focus();
    });
  const closeEditor = () => {
    setEditor(undefined);
    restoreFocus();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Опыт работы</CardTitle>
        <CardDescription>
          Добавьте места работы, задачи и результаты. Текущие места работы
          отображаются первыми.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {(!props.profileId || actions.profileMissing) && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Сначала создайте профиль, чтобы добавлять опыт работы.
            </p>
            <Button
              type="button"
              variant="outline"
              className="self-start"
              disabled={props.busy}
              onClick={props.onGoToProfile}
            >
              Перейти к профилю
            </Button>
          </div>
        )}
        {props.profileId && (
          <>
            {actions.loading && (
              <p role="status" className="text-sm text-muted-foreground">
                Загрузка опыта работы…
              </p>
            )}
            {actions.loadError && (
              <div className="flex flex-col gap-3">
                <p role="alert" className="text-sm text-destructive">
                  {actions.loadError}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="self-start"
                  disabled={props.busy || actions.loading}
                  onClick={() => void actions.refresh()}
                >
                  Повторить загрузку списка
                </Button>
              </div>
            )}
            {actions.items && (
              <p className="text-sm text-muted-foreground">
                Добавлено: {actions.items.length} из {EXPERIENCE_LIMIT}
              </p>
            )}
            {actions.atLimit && (
              <p className="text-sm text-muted-foreground">
                Можно добавить не больше 30 мест работы. Существующие записи
                можно редактировать и удалять.
              </p>
            )}
            <Button
              ref={addButton}
              type="button"
              variant="outline"
              size="lg"
              className="self-start"
              disabled={disabled || actions.atLimit || !!editor}
              onClick={() => {
                actions.clearMessage();
                setEditor({});
              }}
            >
              <PlusIcon aria-hidden="true" />
              Добавить место работы
            </Button>
            {editor && (
              <ExperienceForm
                record={editor.record}
                disabled={disabled || (!editor.record && actions.atLimit)}
                busy={props.busy}
                error={actions.message}
                onSave={actions.save}
                onClose={closeEditor}
              />
            )}
            {!editor && actions.message && (
              <p role="alert" className="text-sm text-destructive">
                {actions.message}
              </p>
            )}
            {actions.message && !actions.loadError && (
              <Button
                type="button"
                variant="outline"
                className="self-start"
                disabled={props.busy || actions.loading}
                onClick={() => void actions.refresh()}
              >
                Обновить список
              </Button>
            )}
            {!actions.stale && actions.items && (
              <ul
                ref={list}
                aria-label="Места работы"
                className="flex flex-col gap-5"
              >
                {actions.items.map((record) => (
                  <ExperienceItem
                    key={record.id}
                    record={record}
                    disabled={disabled || !!editor}
                    onEdit={() => {
                      actions.clearMessage();
                      setEditor({ record });
                    }}
                    onDelete={() => {
                      actions.clearMessage();
                      setDeleting(record);
                    }}
                  />
                ))}
              </ul>
            )}
            {!actions.loading &&
              !actions.loadError &&
              actions.items?.length === 0 &&
              !editor && (
                <p className="text-sm text-muted-foreground">
                  Мест работы пока нет. Добавьте первое или продолжите
                  заполнение профиля.
                </p>
              )}
          </>
        )}
      </CardContent>
      {deleting && (
        <ConfirmDeleteDialog
          title={`Удалить место работы «${deleting.company}»?`}
          description="Запись о работе и её описание будут удалены. Общий стаж в профиле останется прежним."
          error={actions.message}
          busy={props.busy}
          onConfirm={() => actions.remove(deleting.id)}
          onClose={() => {
            setDeleting(undefined);
            restoreFocus();
          }}
        />
      )}
    </Card>
  );
};
