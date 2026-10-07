import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { ApiError } from '@/shared/api/errors';
import { toast } from '@/shared/ui/Sonner';
import type { CandidateProfile } from '@/entities/candidate-profile';
import {
  createCandidateProfile,
  getCandidateProfileClient,
  updateCandidateProfile,
} from '@/entities/candidate-profile/api';

import { profileSchema } from '../constants';
import { getProfileErrorMessage } from '../lib/getProfileErrorMessage';
import {
  buildProfilePatch,
  mergeProfileDraft,
  toProfileFormValues,
  toProfileInput,
} from '../lib/profileForm';
import type { ProfileFormValues } from './types';

type UseCandidateProfileFormOptions = {
  profile?: CandidateProfile;
  onProfileChange: (profile: CandidateProfile | undefined) => void;
  onBusyChange: (busy: boolean) => void;
};

export const useCandidateProfileForm = ({
  profile,
  onProfileChange,
  onBusyChange,
}: UseCandidateProfileFormOptions) => {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: toProfileFormValues(profile),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  const values = useWatch({ control: form.control }) as ProfileFormValues;
  const { dirtyFields } = form.formState;
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');
  const saving = useRef(false);
  const reportError = (message: string) => {
    setMessage(message);
    toast.error(message);
  };
  const reportSuccess = (message: string) => {
    setSuccess(message);
    toast.success(message);
  };
  const dirty =
    !profile || Object.keys(buildProfilePatch(profile, values)).length > 0;

  const save = async (values: ProfileFormValues) => {
    if (saving.current) return;
    setMessage('');
    setSuccess('');
    if (!dirty) return;
    const changedFields = (
      Object.keys(values) as (keyof ProfileFormValues)[]
    ).filter((key) => dirtyFields[key]);
    saving.current = true;
    onBusyChange(true);
    try {
      const next = profile
        ? await updateCandidateProfile(buildProfilePatch(profile, values))
        : await createCandidateProfile(toProfileInput(values));
      onProfileChange(next);
      form.reset(toProfileFormValues(next));
      reportSuccess('Профиль сохранён.');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'profile_exists') {
        try {
          const existing = await getCandidateProfileClient();
          const merged = mergeProfileDraft(existing, values, changedFields);
          form.reset(toProfileFormValues(existing));
          form.reset(merged, { keepDefaultValues: true });
          onProfileChange(existing);
          reportError(
            'Профиль уже создан. Ваш ввод сохранён: проверьте данные и сохраните изменения.',
          );
        } catch (reloadError) {
          reportError(getProfileErrorMessage(reloadError));
        }
      } else if (
        error instanceof ApiError &&
        error.code === 'profile_not_found'
      ) {
        onProfileChange(undefined);
        reportError(
          'Профиль не найден. Ваш ввод сохранён: создайте профиль снова.',
        );
      } else reportError(getProfileErrorMessage(error));
    } finally {
      saving.current = false;
      onBusyChange(false);
    }
  };

  return { form, message, success, dirty, save };
};
