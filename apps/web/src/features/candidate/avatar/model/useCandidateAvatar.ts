import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { ApiError } from '@/shared/api/errors';
import { CANDIDATE_ELEMENT_IDS, STATIC_ROUTES } from '@/shared/contants';
import { useUnsavedChanges } from '@/shared/hooks';
import { toast } from '@/shared/ui';
import {
  type CandidateProfile,
  deleteCandidateAvatar,
  getCandidateAvatar,
  uploadCandidateAvatar,
} from '@/entities/candidate';

import { getAvatarError } from '../lib';
import { avatarSchema, avatarSourceSchema } from './avatarSchema';

type AvatarFormValues = {
  file: File;
};
export type CandidateAvatarOptions = {
  profile?: CandidateProfile;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onProfileChange: (profile: CandidateProfile) => void;
};

export const useCandidateAvatar = ({
  profile,
  busy,
  onBusyChange,
  onProfileChange,
}: CandidateAvatarOptions) => {
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
  useUnsavedChanges(!!selectedFile || !!editorFile, {
    preserveWithin: useMemo(
      () => [
        STATIC_ROUTES.CANDIDATE,
        STATIC_ROUTES.CANDIDATE_CONSENTS,
        STATIC_ROUTES.CANDIDATE_PROFILE,
        STATIC_ROUTES.CANDIDATE_CONTACTS,
        STATIC_ROUTES.CANDIDATE_EXPERIENCE,
        STATIC_ROUTES.CANDIDATE_EDUCATION,
        STATIC_ROUTES.CANDIDATE_SKILLS,
        STATIC_ROUTES.CANDIDATE_READINESS,
      ],
      [],
    ),
  });

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

  return {
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
  };
};
