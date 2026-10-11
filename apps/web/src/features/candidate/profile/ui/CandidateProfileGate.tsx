'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { ApiError, ensureClientAccessToken } from '@/shared/api';
import { STATIC_ROUTES } from '@/shared/contants';
import { useRemoteData } from '@/shared/hooks';
import { AsyncState, Button, RemoteState } from '@/shared/ui';
import { getCandidateFullProfileClient } from '@/entities/candidate/profile';

const loadProfile = async (signal: AbortSignal) => {
  await ensureClientAccessToken();
  signal.throwIfAborted();
  try {
    return await getCandidateFullProfileClient(signal);
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 404 &&
      error.code === 'profile_not_found'
    )
      return { profile: null };
    throw error;
  }
};

interface CandidateProfileGateProps {
  children: ReactNode;
  /** Каркас страницы на время проверки профиля, чтобы не мигал общий скелетон. */
  fallback?: ReactNode;
}

export const CandidateProfileGate = ({
  children,
  fallback,
}: CandidateProfileGateProps) => {
  const query = useRemoteData(loadProfile);
  if (query.loading && fallback) return fallback;
  if (query.loading || query.error) {
    return (
      <RemoteState
        loading={query.loading}
        error={query.error}
        retry={query.retry}
      />
    );
  }

  if (!query.data?.profile) {
    return (
      <div className="grid gap-4 p-6">
        <AsyncState
          title="Создайте профиль кандидата"
          description="Заполните профиль, чтобы проходить тесты, получать предложения и отправлять решения заданий."
        />
        <Button asChild className="justify-self-center">
          <Link href={STATIC_ROUTES.CANDIDATE_PROFILE}>Заполнить профиль</Link>
        </Button>
      </div>
    );
  }

  return children;
};
