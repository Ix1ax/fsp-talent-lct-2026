import { useCallback, useEffect, useRef, useState } from 'react';

import { ensureClientAccessToken } from '@/shared/api';
import { ApiError } from '@/shared/api/errors';
import { toast } from '@/shared/ui';
import {
  addCandidateExperience,
  type CandidateExperience,
  deleteCandidateExperience,
  getCandidateExperiences,
  saveCandidateExperience,
  type SaveCandidateExperienceInput,
} from '@/entities/candidate';

import { getExperienceErrorMessage } from '../lib';
import { EXPERIENCE_LIMIT } from './experienceSchema';

type UseCandidateExperienceOptions = {
  profileId?: string;
  active: boolean;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onCountChange: (count: number) => void;
  onSaved?: () => void;
};

export const useCandidateExperience = ({
  profileId,
  active,
  busy,
  onBusyChange,
  onCountChange,
  onSaved,
}: UseCandidateExperienceOptions) => {
  const [items, setItems] = useState<CandidateExperience[]>();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [stale, setStale] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [profileMissing, setProfileMissing] = useState(false);
  const [previousProfileId, setPreviousProfileId] = useState(profileId);
  const request = useRef<AbortController | null>(null);
  const mutating = useRef(false);

  const refresh = useCallback(async () => {
    if (!profileId) return false;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      await ensureClientAccessToken();
      if (controller.signal.aborted) return false;
      setLoading(true);
      setLoadError('');
      const next = await getCandidateExperiences(controller.signal);
      if (controller.signal.aborted) return false;
      setItems(next.items);
      onCountChange(next.items.length);
      setStale(false);
      setLimitReached(false);
      setProfileMissing(false);
      setMessage('');
      return true;
    } catch (error) {
      if (!controller.signal.aborted) {
        setLoadError(getExperienceErrorMessage(error));
        if (error instanceof ApiError && error.code === 'profile_not_found')
          setProfileMissing(true);
      }
      return false;
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [profileId, onCountChange]);

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
    onCountChange(0);
  }, [profileId, onCountChange]);

  useEffect(() => {
    if (!active || !profileId) return;
    let disposed = false;
    // Сначала восстанавливаем сессию, затем загружаем приватные данные.
    void ensureClientAccessToken()
      .then(() => {
        if (!disposed) return refresh();
      })
      .catch((error) => {
        if (!disposed) setLoadError(getExperienceErrorMessage(error));
      });
    return () => {
      disposed = true;
      request.current?.abort();
    };
  }, [active, profileId, refresh]);

  const mutate = async (action: () => Promise<unknown>, success: string) => {
    if (
      busy ||
      mutating.current ||
      !profileId ||
      profileMissing ||
      stale ||
      !items ||
      loading
    )
      return false;
    mutating.current = true;
    request.current?.abort();
    onBusyChange(true);
    setMessage('');
    try {
      await ensureClientAccessToken();
      await action();
      setStale(true);
      toast.success(success, { id: 'candidate-experience' });
      // Ошибка повторной загрузки не отменяет успешное сохранение.
      // Не предлагаем повторять POST, чтобы не создавать дубликат.
      if (!(await refresh()))
        setMessage(
          `${success} Не удалось обновить список. Повторите загрузку списка.`,
        );
      onSaved?.();
      return true;
    } catch (error) {
      const text = getExperienceErrorMessage(error);
      setMessage(text);
      if (error instanceof ApiError && error.code === 'limit_reached')
        setLimitReached(true);
      if (error instanceof ApiError && error.code === 'profile_not_found')
        setProfileMissing(true);
      toast.error(text, { id: 'candidate-experience' });
      return false;
    } finally {
      mutating.current = false;
      onBusyChange(false);
    }
  };

  const save = (input: SaveCandidateExperienceInput, id?: string) => {
    if (!id && (limitReached || (items?.length ?? 0) >= EXPERIENCE_LIMIT))
      return Promise.resolve(false);
    return mutate(
      () =>
        id ? saveCandidateExperience(id, input) : addCandidateExperience(input),
      'Место работы сохранено.',
    );
  };
  const remove = (id: string) =>
    mutate(() => deleteCandidateExperience(id), 'Место работы удалено.');

  return {
    items,
    loading: active && (loading || (!!profileId && !items && !loadError)),
    loadError,
    message,
    stale,
    profileMissing,
    atLimit: limitReached || (items?.length ?? 0) >= EXPERIENCE_LIMIT,
    refresh,
    save,
    remove,
    clearMessage: () => setMessage(''),
  };
};
