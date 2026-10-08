import { PlusIcon } from 'lucide-react';

import { useCollectionEditor } from '@/shared/hooks';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDeleteDialog,
} from '@/shared/ui';
import type { CandidateEducation } from '@/entities/candidate';

import { EDUCATION_LIMIT } from '../constants';
import { useCandidateEducation } from '../model';
import { EducationForm } from './EducationForm';
import { EducationItem } from './EducationItem';

interface CandidateEducationCardProps {
  profileId?: string;
  active: boolean;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onCountChange: (count: number) => void;
  onSaved?: () => void;
  onGoToProfile: () => void;
}

export const CandidateEducationCard = (props: CandidateEducationCardProps) => {
  const actions = useCandidateEducation(props);
  const {
    editor,
    deleting,
    addButton,
    list,
    disabled,
    openNew,
    openEdit,
    requestDelete,
    closeEditor,
    closeDelete,
  } = useCollectionEditor<CandidateEducation>({
    ...actions,
    busy: props.busy,
    unavailable: actions.profileMissing,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Образование</CardTitle>
        <CardDescription>
          Укажите учебные заведения и специальности. Сначала отображаются записи
          с более поздним годом окончания.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {(!props.profileId || actions.profileMissing) && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Сначала создайте профиль, чтобы добавлять образование.
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
        {(props.profileId || editor) && (
          <>
            {actions.loading && (
              <p role="status" className="text-sm text-muted-foreground">
                Загрузка образования…
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
                Добавлено: {actions.items.length} из {EDUCATION_LIMIT}
              </p>
            )}
            {actions.atLimit && (
              <p className="text-sm text-muted-foreground">
                Можно добавить не больше 10 записей об образовании. Существующие
                записи можно редактировать и удалять.
              </p>
            )}
            <Button
              ref={addButton}
              type="button"
              variant="outline"
              size="lg"
              className="self-start"
              disabled={disabled || actions.atLimit || !!editor}
              onClick={openNew}
            >
              <PlusIcon aria-hidden="true" />
              Добавить образование
            </Button>
            {editor && (
              <EducationForm
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
                aria-label="Образование"
                className="flex flex-col gap-5"
              >
                {actions.items.map((record) => (
                  <EducationItem
                    key={record.id}
                    record={record}
                    disabled={disabled || !!editor}
                    onEdit={() => openEdit(record)}
                    onDelete={() => requestDelete(record)}
                  />
                ))}
              </ul>
            )}
            {!actions.loading &&
              !actions.loadError &&
              actions.items?.length === 0 &&
              !editor && (
                <p className="text-sm text-muted-foreground">
                  Образования пока нет. Добавьте запись или продолжите
                  заполнение профиля.
                </p>
              )}
          </>
        )}
      </CardContent>
      {deleting && (
        <ConfirmDeleteDialog
          title={`Удалить образование «${deleting.institution}»?`}
          description="Запись об образовании будет удалена из вашего профиля."
          error={actions.message}
          busy={props.busy}
          onConfirm={() => actions.remove(deleting.id)}
          onClose={closeDelete}
        />
      )}
    </Card>
  );
};
