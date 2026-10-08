import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import dynamic from 'next/dynamic';
import { zodResolver } from '@hookform/resolvers/zod';

import { ApiError } from '@/shared/api/errors';
import { CANDIDATE_ELEMENT_IDS } from '@/shared/contants';
import { useUnsavedChanges } from '@/shared/hooks';
import { Button, ConfirmDeleteDialog, Input, toast } from '@/shared/ui';
import {
  type CandidateProfile,
  deleteCandidateAvatar,
  getCandidateAvatar,
  uploadCandidateAvatar,
} from '@/entities/candidate';

import { getAvatarError } from '../lib';
import { avatarSchema, avatarSourceSchema } from '../model';
import { CandidateAvatarPreview } from './CandidateAvatarPreview';
import { SelectedAvatarPreview } from './SelectedAvatarPreview';

const AvatarCropDialog = dynamic(
  () => import('./AvatarCropDialog').then((module) => module.AvatarCropDialog),
  { ssr: false },
);

type AvatarFormValues = {
  file: File;
};

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
  const form = useForm<AvatarFormValues>({
    resolver: zodResolver(avatarSchema),
  });
  const selectedFile = useWatch({ control: form.control, name: 'file' });
  const { errors, isValidating, isSubmitting } = form.formState;
  const formDisabled = busy || isValidating || isSubmitting;
  const [message, setMessage] = useState('');
  const [originalFile, setOriginalFile] = useState<File>();
  const [editorFile, setEditorFile] = useState<File>();
  const [checking, setChecking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [revision, setRevision] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const mutating = useRef(false);
  useUnsavedChanges(!!selectedFile || !!editorFile);

  const disabled = formDisabled || checking || !!editorFile;

  const reportError = useCallback(
    (message: string, field: 'file' | 'root' = 'root') => {
      form.setError(field, { message });
      toast.error(message, { id: CANDIDATE_ELEMENT_IDS.avatar.input });
    },
    [form],
  );

  const reportSuccess = useCallback((message: string) => {
    setMessage(message);
    toast.success(message, { id: CANDIDATE_ELEMENT_IDS.avatar.input });
  }, []);

  const chooseFile = async (file: File) => {
    setMessage('');
    form.clearErrors();
    setChecking(true);

    try {
      const validation = await avatarSourceSchema.safeParseAsync({ file });
      if (!validation.success) {
        reportError(validation.error.issues[0].message, 'file');
        return;
      }
      setEditorFile(file);
    } catch {
      reportError('Не удалось прочитать фото. Выберите другой файл.', 'file');
    } finally {
      setChecking(false);
    }
  };

  const editPhoto = async () => {
    if (disabled) return;
    if (selectedFile) {
      setEditorFile(originalFile ?? selectedFile);
      return;
    }
    if (!profile?.avatarFileId) {
      inputRef.current?.click();
      return;
    }
    setChecking(true);
    form.clearErrors();

    try {
      const blob = await getCandidateAvatar();
      const type = blob.type === 'image/png' ? 'image/png' : 'image/jpeg';
      setEditorFile(
        new File([blob], type === 'image/png' ? 'avatar.png' : 'avatar.jpg', {
          type,
        }),
      );
    } catch (error) {
      reportError(getAvatarError(error));
    } finally {
      setChecking(false);
    }
  };

  const upload = useCallback(
    async (file: File) => {
      if (!profile || busy || mutating.current) return;
      mutating.current = true;
      onBusyChange(true);
      form.clearErrors();
      setMessage('');

      try {
        onProfileChange(await uploadCandidateAvatar(file));
        setRevision((previous) => previous + 1);
        form.reset();
        setOriginalFile(undefined);
        reportSuccess('Аватар сохранён.');
      } catch (error) {
        reportError(getAvatarError(error));
      } finally {
        mutating.current = false;
        onBusyChange(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [
      busy,
      form,
      onBusyChange,
      onProfileChange,
      profile,
      reportError,
      reportSuccess,
    ],
  );

  const remove = async () => {
    if (!profile || busy || mutating.current) return false;
    mutating.current = true;
    onBusyChange(true);
    form.clearErrors();
    setMessage('');

    try {
      await deleteCandidateAvatar();
      onProfileChange({ ...profile, avatarFileId: null });
      reportSuccess('Аватар удалён.');
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.code === 'avatar_not_found') {
        onProfileChange({ ...profile, avatarFileId: null });
        reportSuccess('Аватар уже удалён.');
        return true;
      }
      reportError(getAvatarError(error));
      return false;
    } finally {
      mutating.current = false;
      onBusyChange(false);
    }
  };

  useEffect(() => {
    if (
      !profile?.id ||
      !selectedFile ||
      errors.file ||
      errors.root ||
      busy ||
      mutating.current
    )
      return;
    void avatarSchema.safeParseAsync({ file: selectedFile }).then((result) => {
      if (result.success) void upload(selectedFile);
    });
  }, [busy, errors.file, errors.root, profile?.id, selectedFile, upload]);

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
