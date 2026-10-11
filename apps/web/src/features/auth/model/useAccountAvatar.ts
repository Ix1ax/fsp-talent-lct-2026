'use client';

import { useEffect, useState } from 'react';

import { ensureClientAccessToken } from '@/shared/api';
import {
  CANDIDATE_AVATAR_UPDATED_EVENT,
  getCandidateAvatar,
} from '@/entities/candidate';
import type { SessionUser } from '@/entities/session';

type AccountAvatar = {
  userId: string;
  url: string;
};

export const useAccountAvatar = (user: SessionUser) => {
  const [avatar, setAvatar] = useState<AccountAvatar>();

  useEffect(() => {
    if (user.role !== 'candidate') return;
    let controller: AbortController;
    let objectUrl: string | undefined;

    const load = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;

      try {
        const token = await ensureClientAccessToken();
        if (!token || request.signal.aborted) return;
        const blob = await getCandidateAvatar(request.signal);
        if (request.signal.aborted) return;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = URL.createObjectURL(blob);
        setAvatar({ userId: user.id, url: objectUrl });
      } catch {
        if (request.signal.aborted) return;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = undefined;
        setAvatar(undefined);
      }
    };

    const refresh = () => void load();
    refresh();
    window.addEventListener(CANDIDATE_AVATAR_UPDATED_EVENT, refresh);
    return () => {
      controller?.abort();
      window.removeEventListener(CANDIDATE_AVATAR_UPDATED_EVENT, refresh);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [user.id, user.role]);

  return user.role === 'candidate' && avatar?.userId === user.id
    ? avatar.url
    : undefined;
};
