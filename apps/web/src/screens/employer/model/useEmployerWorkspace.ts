'use client';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { useGuardedRouter, useUnsavedGuard } from '@/shared/hooks';

import type { EmployerSection } from '../constants';
import { getEmployerHref } from '../lib';
import type { useEmployerBoard } from './useEmployerBoard';

type EmployerWorkspaceOptions = {
  section: EmployerSection;
  board: ReturnType<typeof useEmployerBoard>;
};
export const useEmployerWorkspace = ({
  section,
  board,
}: EmployerWorkspaceOptions) => {
  const router = useGuardedRouter();
  const searchParams = useSearchParams();
  const [createCompany, setCreateCompany] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const previousView = useRef({ section, createCompany });
  useLayoutEffect(() => {
    if (
      previousView.current.section === section &&
      previousView.current.createCompany === createCompany
    )
      return;
    previousView.current = { section, createCompany };
    mainRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, [section, createCompany]);
  const [createdNeed, setCreatedNeed] = useState(false);
  const [composer, setComposer] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, boolean>>({});
  const dirty = Object.values(drafts).some(Boolean);
  const [childBusy, setChildBusy] = useState(false);
  const busy = board.pending || childBusy;
  const dirtyChanged = useCallback(
    (value: boolean) => setDrafts((state) => ({ ...state, vacancies: value })),
    [],
  );
  const profileDirtyChanged = useCallback(
    (value: boolean) => setDrafts((state) => ({ ...state, profile: value })),
    [],
  );
  const teamDirtyChanged = useCallback(
    (value: boolean) => setDrafts((state) => ({ ...state, team: value })),
    [],
  );
  const documentsDirtyChanged = useCallback(
    (value: boolean) => setDrafts((state) => ({ ...state, documents: value })),
    [],
  );
  const invitationDirtyChanged = useCallback(
    (value: boolean) => setDrafts((state) => ({ ...state, invitation: value })),
    [],
  );
  const tasksDirtyChanged = useCallback(
    (value: boolean) => setDrafts((state) => ({ ...state, tasks: value })),
    [],
  );
  const busyChanged = useCallback((value: boolean) => setChildBusy(value), []);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [candidateId, setCandidateId] = useState('');
  const [offer, setOffer] = useState(false);
  const unsaved = useUnsavedGuard(dirty, busy, false);
  const needUnsaved = useUnsavedGuard(drafts.vacancies ?? false, busy, false);
  const guardNeed = needUnsaved.guard;
  const guard = unsaved.guard;

  const href = (next: EmployerSection, companyId = board.companyId) => {
    return getEmployerHref(next, companyId, searchParams.toString());
  };
  const navigate = (next: EmployerSection) => {
    if (busy) return;
    const action = () => {
      setCreateCompany(false);
      setCandidateId('');
      setOffer(false);
      board.clearError();
      router.push(href(next), { scroll: false });
    };
    if (createCompany || next === 'invitation') guard(action);
    else router.navigate(href(next), action);
  };
  const startCompany = () =>
    guard(() => {
      setCreateCompany(true);
      setComposer(false);
      board.clearError();
      router.push(href('profile'), { scroll: false });
    });
  const refreshCompanies = async (id?: string) => board.refreshCompanies(id);
  return {
    router,
    drafts,
    createCompany,
    setCreateCompany,
    mainRef,
    createdNeed,
    setCreatedNeed,
    composer,
    setComposer,
    busy,
    dirtyChanged,
    profileDirtyChanged,
    teamDirtyChanged,
    documentsDirtyChanged,
    invitationDirtyChanged,
    tasksDirtyChanged,
    busyChanged,
    archiveConfirm,
    setArchiveConfirm,
    candidateId,
    setCandidateId,
    offer,
    setOffer,
    guardNeed,
    guard,
    href,
    navigate,
    startCompany,
    refreshCompanies,
  };
};

export type EmployerWorkspace = Omit<
  ReturnType<typeof useEmployerWorkspace>,
  'mainRef'
>;
