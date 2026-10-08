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

import { EDUCATION_LIMIT } from '../constants';
import { getEducationErrorMessage } from '../lib';

type UseCandidateEducationOptions = {
  profileId?: string;
  active: boolean;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onCountChange: (count: number) => void;
};

export const useCandidateEducation = ({
  profileId,
  active,
  busy,
  onBusyChange,
  onCountChange,
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
      const next = await getCandidateEducations(controller.signal);
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
        setLoadError(getEducationErrorMessage(error));
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
        if (!disposed) setLoadError(getEducationErrorMessage(error));
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
      toast.success(success, { id: 'candidate-education' });
      // Ошибка повторной загрузки не отменяет успешное сохранение.
      // Не предлагаем повторять POST, чтобы не создавать дубликат.
      if (!(await refresh()))
        setMessage(
          `${success} Не удалось обновить список. Повторите загрузку списка.`,
        );
      return true;
    } catch (error) {
      const text = getEducationErrorMessage(error);
      setMessage(text);
      if (error instanceof ApiError && error.code === 'limit_reached')
        setLimitReached(true);
      if (error instanceof ApiError && error.code === 'profile_not_found')
        setProfileMissing(true);
      toast.error(text, { id: 'candidate-education' });
      return false;
    } finally {
      mutating.current = false;
      onBusyChange(false);
    }
  };

  const save = (input: SaveCandidateEducationInput, id?: string) => {
    if (!id && (limitReached || (items?.length ?? 0) >= EDUCATION_LIMIT))
      return Promise.resolve(false);
    return mutate(
      () =>
        id ? saveCandidateEducation(id, input) : addCandidateEducation(input),
      'Образование сохранено.',
    );
  };
  const remove = (id: string) =>
    mutate(() => deleteCandidateEducation(id), 'Образование удалено.');

  return {
    items,
    loading: active && (loading || (!!profileId && !items && !loadError)),
    loadError,
    message,
    stale,
    profileMissing,
    atLimit: limitReached || (items?.length ?? 0) >= EDUCATION_LIMIT,
    refresh,
    save,
    remove,
    clearMessage: () => setMessage(''),
  };
};
