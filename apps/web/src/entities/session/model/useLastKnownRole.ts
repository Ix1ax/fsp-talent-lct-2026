'use client';

import { useSyncExternalStore } from 'react';

import { readLastKnownRole } from './lastKnownRole';
import type { UserRole } from './types';

const subscribe = () => () => {};

/** Роль последнего входа; на сервере и при гидрации — null. */
export const useLastKnownRole = (): UserRole | null =>
  useSyncExternalStore(subscribe, readLastKnownRole, () => null);
