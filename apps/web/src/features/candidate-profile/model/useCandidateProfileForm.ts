import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { ApiError } from '@/shared/api/errors';
import { toast } from '@/shared/ui/Sonner';
import type { CandidateConsents } from '@/entities/candidate-consent';
import type { CandidateProfile } from '@/entities/candidate-profile';
import {
  createCandidateProfile,
  getCandidateProfileClient,
  updateCandidateProfile,
} from '@/entities/candidate-profile/api';

import { profileSchema } from '../constants';
import {
  buildProfilePatch,
  getProfileConsentError,
  getProfileErrorMessage,
  mergeProfileDraft,
  toProfileFormValues,
  toProfileInput,
} from '../lib';
import type { ProfileFormValues } from './types';

type UseCandidateProfileFormOptions = {
  profile?: CandidateProfile;
  consents: CandidateConsents;
  onConsentRequired: () => Promise<void>;
  onProfileChange: (profile: CandidateProfile | undefined) => void;
  onBusyChange: (busy: boolean) => void;
};

export const useCandidateProfileForm = ({
  profile,
  consents,
  onConsentRequired,
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
  const previousStatus = useRef(profile?.searchStatus);
  const previousProfile = useRef(profile);
  const { reset, setValue } = form;
  useEffect(() => {
    if (previousProfile.current !== profile) {
      reset(toProfileFormValues(profile), { keepDirtyValues: true });
      previousProfile.current = profile;
    }
    if (
      previousStatus.current !== undefined &&
      previousStatus.current !== profile?.searchStatus &&
      profile?.searchStatus === 'hidden'
    )
      setValue('searchStatus', 'hidden', { shouldDirty: true });
    previousStatus.current = profile?.searchStatus;
  }, [profile, reset, setValue]);
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
  const consentError = getProfileConsentError(
    consents,
    !!profile,
    values.searchStatus,
  );

  const save = async (values: ProfileFormValues) => {
    if (saving.current) return;
    setMessage('');
    setSuccess('');
    if (!dirty) return;
    const permissionError = getProfileConsentError(
      consents,
      !!profile,
      values.searchStatus,
    );
    if (permissionError) {
      reportError(permissionError);
      return;
    }
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
        error.code === 'consent_required'
      ) {
        reportError(getProfileErrorMessage(error));
        try {
          await onConsentRequired();
        } catch {
          reportError(
            'Не удалось обновить согласия. Ваш ввод сохранён. Повторите загрузку согласий.',
          );
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

  return { form, message, success, dirty, consentError, save };
};
