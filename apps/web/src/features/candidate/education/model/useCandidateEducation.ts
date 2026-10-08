import { useCallback, useEffect, useRef, useState } from 'react';

import { ensureClientAccessToken } from '@/shared/api';
import { ApiError } from '@/shared/api/errors';
import { toast } from '@/shared/ui';
import {
  addCandidateEducation,
  type CandidateEducation,
  deleteCandidateEducation,
  getCandidateEducations,
  saveCandidateEducation,
  type SaveCandidateEducationInput,
} from '@/entities/candidate';

import { getEducationErrorMessage } from '../lib';
import { EDUCATION_LIMIT } from './educationSchema';

type UseCandidateEducationOptions = {
  profileId?: string;
  active: boolean;
  revision?: number;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onCountChange: (count: number) => void;
  onSaved?: () => void;
};

export const useCandidateEducation = ({
  profileId,
  active,
  revision,
  busy,
  onBusyChange,
  onCountChange,
  onSaved,
}: UseCandidateEducationOptions) => {
  const [items, setItems] = useState<CandidateEducation[]>();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [stale, setStale] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [profileMissing, setProfileMissing] = useState(false);
  const [previousProfileId, setPreviousProfileId] = useState(profileId);
  const request = useRef<AbortController | null>(null);
  const mutationRequest = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    if (!profileId) return Promise.resolve(false);
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;

    return ensureClientAccessToken()
      .then(async () => {
        if (controller.signal.aborted) return false;
        setLoading(true);
        setLoadError('');
        const next = await getCandidateEducations(controller.signal);
        if (controller.signal.aborted) return false;
        setItems(next.items);
        setStale(false);
        setLimitReached(false);
        setProfileMissing(false);
        setMessage('');
        return true;
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(getEducationErrorMessage(error));
          if (error instanceof ApiError && error.code === 'profile_not_found')
            setProfileMissing(true);
        }
        return false;
      })
      .finally(() => {
        if (request.current === controller) {
          request.current = null;
          if (!controller.signal.aborted) setLoading(false);
        }
      });
  }, [profileId]);

  if (previousProfileId !== profileId) {
    setPreviousProfileId(profileId);
    setItems(undefined);
    setLoadError('');
    setMessage('');
    setLoading(false);
    setStale(false);
    setLimitReached(false);
    setProfileMissing(false);
  }

  useEffect(() => {
    onCountChange(items?.length ?? 0);
  }, [items, onCountChange]);

  useEffect(() => {
    if (!profileId) return;
    void refresh();
    return () => request.current?.abort();
  }, [profileId, refresh, revision]);

  useEffect(() => () => mutationRequest.current?.abort(), [profileId]);

  const mutate = async (
    action: (signal: AbortSignal) => Promise<unknown>,
    success: string,
  ) => {
    if (
      busy ||
      mutationRequest.current ||
      !profileId ||
      profileMissing ||
      stale ||
      !items ||
      loading ||
      (request.current && !request.current.signal.aborted)
    )
      return false;

    const controller = new AbortController();
    mutationRequest.current = controller;
    setMessage('');
    try {
      onBusyChange(true);
      try {
        await ensureClientAccessToken();
        if (controller.signal.aborted) return false;
        await action(controller.signal);
      } catch (error) {
        if (controller.signal.aborted) return false;
        const text = getEducationErrorMessage(error);
        setMessage(text);
        if (error instanceof ApiError && error.code === 'limit_reached')
          setLimitReached(true);
        if (error instanceof ApiError && error.code === 'profile_not_found')
          setProfileMissing(true);
        toast.error(text, { id: 'candidate-education' });
        return false;
      }

      // The write succeeded: refresh or callback failures must not invite another POST.
      if (controller.signal.aborted) return true;
      setStale(true);
      toast.success(success, { id: 'candidate-education' });
      const refreshWarning = `${success} Не удалось обновить список. Повторите загрузку списка.`;
      try {
        const refreshed = await refresh();
        if (controller.signal.aborted) return true;
        if (!refreshed) setMessage(refreshWarning);
        onSaved?.();
      } catch {
        if (!controller.signal.aborted) setMessage(refreshWarning);
      }
      return true;
    } finally {
      if (mutationRequest.current === controller)
        mutationRequest.current = null;
      onBusyChange(false);
    }
  };

  const save = (input: SaveCandidateEducationInput, id?: string) => {
    if (!id && (limitReached || (items?.length ?? 0) >= EDUCATION_LIMIT))
      return Promise.resolve(false);
    return mutate(
      (signal) =>
        id
          ? saveCandidateEducation(id, input, signal)
          : addCandidateEducation(input, signal),
      'Образование сохранено.',
    );
  };
  const remove = (id: string) =>
    mutate(
      (signal) => deleteCandidateEducation(id, signal),
      'Образование удалено.',
    );

  const refreshList = () => {
    if (!profileId || mutationRequest.current) return Promise.resolve(false);
    setLoading(true);
    return refresh();
  };

  return {
    items,
    loading: active && (loading || (!!profileId && !items && !loadError)),
    loadError,
    message,
    stale,
    profileMissing,
    atLimit: limitReached || (items?.length ?? 0) >= EDUCATION_LIMIT,
    refresh: refreshList,
    save,
    remove,
    clearMessage: () => setMessage(''),
  };
};
