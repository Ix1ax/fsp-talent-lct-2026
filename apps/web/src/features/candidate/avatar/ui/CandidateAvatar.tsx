import { Controller } from 'react-hook-form';
import dynamic from 'next/dynamic';

import { CANDIDATE_ELEMENT_IDS } from '@/shared/contants';
import { Button, ConfirmDeleteDialog, Input } from '@/shared/ui';
import { type CandidateProfile } from '@/entities/candidate';

import { avatarSchema, useCandidateAvatar } from '../model';
import { CandidateAvatarPreview } from './CandidateAvatarPreview';
import { SelectedAvatarPreview } from './SelectedAvatarPreview';

const AvatarCropDialog = dynamic(
  () => import('./AvatarCropDialog').then((module) => module.AvatarCropDialog),
  { ssr: false },
);

interface CandidateAvatarProps {
  profile?: CandidateProfile;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onProfileChange: (profile: CandidateProfile) => void;
}

export const CandidateAvatar = ({
  profile,
  busy,
  onBusyChange,
  onProfileChange,
}: CandidateAvatarProps) => {
  const {
    form,
    selectedFile,
    errors,
    isValidating,
    message,
    setMessage,
    setOriginalFile,
    editorFile,
    setEditorFile,
    checking,
    deleting,
    setDeleting,
    revision,
    setRevision,
    inputRef,
    disabled,
    reportError,
    chooseFile,
    editPhoto,
    upload,
    remove,
  } = useCandidateAvatar({ profile, busy, onBusyChange, onProfileChange });
  return (
    <section
      id={CANDIDATE_ELEMENT_IDS.avatar.section}
      aria-label="Фото профиля"
      className="flex flex-col gap-4"
      aria-busy={disabled}
    >
      {selectedFile ? (
        <SelectedAvatarPreview
          file={selectedFile}
          disabled={disabled}
          onAction={() => void editPhoto()}
          onReplace={() => inputRef.current?.click()}
          onRemove={() => {
            form.reset();
            setOriginalFile(undefined);
            setMessage('');
          }}
        />
      ) : (
        <CandidateAvatarPreview
          key={`${profile?.avatarFileId ?? 'none'}-${revision}`}
          hasAvatar={!!profile?.avatarFileId}
          busy={disabled}
          onAction={() => void editPhoto()}
          onRetry={() => setRevision((previous) => previous + 1)}
          onReplace={() => inputRef.current?.click()}
          onRemove={profile?.avatarFileId ? () => setDeleting(true) : undefined}
        />
      )}
      <p
        id={CANDIDATE_ELEMENT_IDS.avatar.hint}
        className="text-sm text-muted-foreground"
      >
        Фото необязательно, его видите только вы. JPEG или PNG.
      </p>
      <form
        onSubmit={(event) => {
          void form.handleSubmit(async ({ file }) => {
            if (!busy) await upload(file);
          })(event);
        }}
        className="flex flex-col gap-3"
        aria-busy={disabled}
      >
        <Controller
          name="file"
          control={form.control}
          render={({ field }) => (
            <Input
              ref={(element) => {
                inputRef.current = element;
                field.ref(element);
              }}
              id={CANDIDATE_ELEMENT_IDS.avatar.input}
              name={field.name}
              type="file"
              className="hidden"
              tabIndex={-1}
              accept="image/jpeg,image/png"
              disabled={disabled}
              aria-label="Выбрать фото"
              aria-describedby={
                errors.file
                  ? [
                      CANDIDATE_ELEMENT_IDS.avatar.hint,
                      CANDIDATE_ELEMENT_IDS.avatar.error,
                    ].join(' ')
                  : CANDIDATE_ELEMENT_IDS.avatar.hint
              }
              onBlur={field.onBlur}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void chooseFile(file);
                event.target.value = '';
              }}
            />
          )}
        />
        {selectedFile && profile && errors.root && (
          <Button
            type="submit"
            disabled={disabled}
            className="self-start"
            variant="outline"
          >
            Повторить сохранение фото
          </Button>
        )}
        {selectedFile && !profile && (
          <p className="text-sm text-muted-foreground">
            Фото выбрано. Создайте профиль, чтобы сохранить его.
          </p>
        )}
        {(isValidating || checking) && (
          <p role="status" className="text-sm text-muted-foreground">
            Проверка фото…
          </p>
        )}
        {errors.file && (
          <p
            id={CANDIDATE_ELEMENT_IDS.avatar.error}
            role="alert"
            className="text-sm text-destructive"
          >
            {errors.file.message}
          </p>
        )}
        {errors.root && (
          <p role="alert" className="text-sm text-destructive">
            {errors.root.message}
          </p>
        )}
      </form>
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
      {deleting && (
        <ConfirmDeleteDialog
          title="Удалить аватар?"
          description="Фото будет удалено из профиля. Чтобы вернуть его, понадобится загрузить фото заново."
          busy={busy}
          onConfirm={remove}
          onClose={() => setDeleting(false)}
        />
      )}
      {editorFile && (
        <AvatarCropDialog
          file={editorFile}
          onCancel={() => setEditorFile(undefined)}
          onApply={async (file) => {
            setOriginalFile(editorFile);
            form.setValue('file', file, {
              shouldValidate: true,
              shouldDirty: true,
            });
            setEditorFile(undefined);
            const validation = await avatarSchema.safeParseAsync({ file });
            if (!validation.success) {
              reportError(validation.error.issues[0].message, 'file');
              return;
            }
          }}
        />
      )}
    </section>
  );
};
