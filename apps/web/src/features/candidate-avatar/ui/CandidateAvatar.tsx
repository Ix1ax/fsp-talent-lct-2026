'use client';

import { useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import dynamic from 'next/dynamic';
import { zodResolver } from '@hookform/resolvers/zod';

import { ApiError } from '@/shared/api/errors';
import { Button, Input, toast } from '@/shared/ui';
import type { CandidateProfile } from '@/entities/candidate-profile';
import {
  deleteCandidateAvatar,
  getCandidateAvatar,
  uploadCandidateAvatar,
} from '@/entities/candidate-profile';

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
  const [revision, setRevision] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const mutating = useRef(false);

  const disabled = formDisabled || checking || !!editorFile;

  const reportError = (message: string, field: 'file' | 'root' = 'root') => {
    form.setError(field, { message });
    toast.error(message);
  };

  const reportSuccess = (message: string) => {
    setMessage(message);
    toast.success(message);
  };

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

  const upload = async (file: File) => {
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
  };

  const remove = async () => {
    if (!profile || busy || mutating.current) return;
    mutating.current = true;
    onBusyChange(true);
    form.clearErrors();
    setMessage('');

    try {
      await deleteCandidateAvatar();
      onProfileChange({ ...profile, avatarFileId: null });
      reportSuccess('Аватар удалён.');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'avatar_not_found') {
        onProfileChange({ ...profile, avatarFileId: null });
        reportSuccess('Аватар уже удалён.');
      } else reportError(getAvatarError(error));
    } finally {
      mutating.current = false;
      onBusyChange(false);
    }
  };

  return (
    <section
      aria-label="Фото профиля"
      className="flex flex-col gap-4 border-b border-border pb-6"
      aria-busy={disabled}
    >
      {selectedFile ? (
        <SelectedAvatarPreview
          file={selectedFile}
          disabled={disabled}
          onAction={() => void editPhoto()}
        />
      ) : (
        <CandidateAvatarPreview
          key={`${profile?.avatarFileId ?? 'none'}-${revision}`}
          hasAvatar={!!profile?.avatarFileId}
          busy={disabled}
          onAction={() => void editPhoto()}
          onRetry={() => setRevision((previous) => previous + 1)}
        />
      )}
      <p id="avatar-help" className="text-sm text-muted-foreground">
        JPEG или PNG. После обрезки — до 2 МиБ и 4 мегапикселей. Аватар виден
        только вам.
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
              id="candidate-avatar"
              name={field.name}
              type="file"
              className="hidden"
              tabIndex={-1}
              accept="image/jpeg,image/png"
              disabled={disabled}
              aria-label="Выбрать фото"
              aria-describedby={
                errors.file ? 'avatar-help avatar-file-error' : 'avatar-help'
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
        <div className="flex flex-wrap gap-2">
          {(selectedFile || profile?.avatarFileId) && (
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              {selectedFile ? 'Выбрать другое фото' : 'Заменить фото'}
            </Button>
          )}
          {selectedFile && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() => setEditorFile(originalFile ?? selectedFile)}
              >
                Редактировать фото
              </Button>
              <Button
                type="submit"
                disabled={disabled || !!errors.file || !profile}
              >
                Сохранить фото
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() => {
                  form.reset();
                  setOriginalFile(undefined);
                  setMessage('');
                }}
              >
                Отменить выбор
              </Button>
            </>
          )}
        </div>
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
            id="avatar-file-error"
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
      {profile?.avatarFileId && (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="self-start"
          onClick={() => void remove()}
        >
          Удалить аватар
        </Button>
      )}
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
      {editorFile && (
        <AvatarCropDialog
          file={editorFile}
          onCancel={() => setEditorFile(undefined)}
          onApply={(file) => {
            setOriginalFile(editorFile);
            form.setValue('file', file, {
              shouldValidate: true,
              shouldDirty: true,
            });
            setEditorFile(undefined);
          }}
        />
      )}
    </section>
  );
};
