import { useCallback, useState } from 'react';

import { CANDIDATE_DATA_UPDATED_EVENT } from '@/shared/contants';
import { useAsyncMutation, useRemoteData } from '@/shared/hooks';
import { toast } from '@/shared/ui';
import { getConsentPermissions } from '@/entities/candidate/consent';
import { getFSP, linkFSP, syncFSP, unlinkFSP } from '@/entities/candidate/fsp';
import { getCandidateFullProfileClient } from '@/entities/candidate/profile';
export const useCandidateFSP = () => {
  const loadProfile = useCallback(
    (signal: AbortSignal) => getCandidateFullProfileClient(signal),
    [],
  );
  const profile = useRemoteData(loadProfile);
  const profileExists = !!profile.data?.profile;
  const processing =
    !!profile.data && getConsentPermissions(profile.data.consents).processing;
  const loadFSP = useCallback((signal: AbortSignal) => getFSP(signal), []);
  const query = useRemoteData(loadFSP, 0, profileExists && processing);
  const mutation = useAsyncMutation();
  const [confirm, setConfirm] = useState(false);
  const changed = () => {
    window.dispatchEvent(new Event(CANDIDATE_DATA_UPDATED_EVENT));
  };
  const save = async (action: 'link' | 'sync') => {
    try {
      const saved = await mutation.run(() =>
        action === 'link' ? linkFSP() : syncFSP(),
      );
      query.updateData(() => saved);
      changed();
      toast.success(
        action === 'link' ? 'Привязка ФСП сохранена' : 'Достижения обновлены',
      );
    } catch {
      // TODO: add error message
    }
  };

  const unlink = async () => {
    try {
      await mutation.run(() => unlinkFSP());
      query.updateData(() => ({ link: null, items: [] }));
      changed();
      toast.success('Привязка и импортированные достижения удалены');
      return true;
    } catch {
      return false;
    }
  };

  return {
    profile,
    profileExists,
    processing,
    query,
    mutation,
    confirm,
    setConfirm,
    save,
    unlink,
  };
};
