import { useEffect, useRef, useState } from 'react';

import { ensureClientAccessToken } from '@/shared/api';
import {
  type CandidateFullProfile,
  getCandidateFullProfileClient,
} from '@/entities/candidate-profile';

import { createProfileRefresh } from './createProfileRefresh';

export const useCandidateFullProfile = (initial?: CandidateFullProfile) => {
  const [fullProfile, setFullProfile] = useState(initial);
  const [previousInitial, setPreviousInitial] = useState(initial);
  const [refreshError, setRefreshError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRequest = useRef(0);
  const [controller] = useState(() =>
    createProfileRefresh({
      load: async (signal) => {
        await ensureClientAccessToken();
        return getCandidateFullProfileClient(signal);
      },
      apply: setFullProfile,
    }),
  );
  if (previousInitial !== initial) {
    setPreviousInitial(initial);
    setFullProfile(initial);
  }
  useEffect(() => () => controller.invalidate(), [controller, initial]);

  const refreshFullProfile = async (signal?: AbortSignal) => {
    const id = ++refreshingRequest.current;
    setRefreshing(true);
    setRefreshError('');
    try {
      await controller.refresh(signal);
    } catch (error) {
      if (id === refreshingRequest.current)
        setRefreshError(
          'Не удалось обновить данные с сервера. Черновики сохранены в форме. Повторите загрузку.',
        );
      throw error;
    } finally {
      if (id === refreshingRequest.current) setRefreshing(false);
    }
  };
  const updateFullProfile = (
    update: (current: CandidateFullProfile) => CandidateFullProfile,
  ) => {
    controller.invalidate();
    setFullProfile((current) => current && update(current));
  };
  const refreshAfterSave = () => {
    void refreshFullProfile().catch(() => {});
  };
  return {
    fullProfile,
    updateFullProfile,
    refreshFullProfile,
    refreshAfterSave,
    refreshing,
    refreshError,
  };
};
