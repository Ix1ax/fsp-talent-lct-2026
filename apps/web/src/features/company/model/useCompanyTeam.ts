import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';
import { EMPLOYER_DRAFT_SCOPE, STATIC_ROUTES } from '@/shared/contants';
import { useAsyncMutation, useFormUnsavedChanges } from '@/shared/hooks';
import { useRemoteData } from '@/shared/hooks/useRemoteData';
import { toast } from '@/shared/ui';
import {
  type Company,
  type CompanyInvitation,
  type CompanyMember,
  type TeamRole,
} from '@/entities/company';

import { invitationSchema } from '../constants';
import { type CompanyManagementApi } from './management';

type InvitationFormValues = { email: string; role: TeamRole };

export type CompanyTeamOptions = {
  active?: boolean;
  company: Company;
  api: CompanyManagementApi;
  onBusyChange: (value: boolean) => void;
  onDirtyChange: (value: boolean) => void;
  onCompanyChange: () => Promise<void>;
};

export const useCompanyTeam = ({
  active = true,
  company,
  api,
  onBusyChange,
  onDirtyChange,
  onCompanyChange,
}: CompanyTeamOptions) => {
  const [memberOffset, setMemberOffset] = useState(0);
  const [invitationOffset, setInvitationOffset] = useState(0);

  const owner = company.memberRole === 'owner';

  const membersLoad = useCallback(
    (signal: AbortSignal) =>
      api.getCompanyMembers(company.id, memberOffset, signal),
    [api, company.id, memberOffset],
  );

  const invitationsLoad = useCallback(
    (signal: AbortSignal) =>
      owner
        ? api.getCompanyInvitations(company.id, invitationOffset, signal)
        : Promise.resolve({ items: [], limit: 20, offset: 0 }),
    [api, company.id, invitationOffset, owner],
  );

  const members = useRemoteData(membersLoad, 0, active);
  const invitations = useRemoteData(invitationsLoad, 0, active);
  const mutation = useAsyncMutation();
  const [created, setCreated] = useState<CompanyInvitation | null>(null);
  const [remove, setRemove] = useState<
    CompanyMember | CompanyInvitation | null
  >(null);

  const form = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationSchema),
    defaultValues: { email: '', role: 'recruiter' },
  });

  const { dirty, markSaved } = useFormUnsavedChanges(form, {
    preserveWithin: useMemo(
      () => [
        STATIC_ROUTES.EMPLOYER,
        STATIC_ROUTES.EMPLOYER_PROFILE,
        STATIC_ROUTES.EMPLOYER_DOCUMENTS,
        STATIC_ROUTES.EMPLOYER_TEAM,
        STATIC_ROUTES.EMPLOYER_VACANCIES,
        STATIC_ROUTES.EMPLOYER_CANDIDATES,
        STATIC_ROUTES.EMPLOYER_OFFERS,
      ],
      [],
    ),
    scopeSearchParams: EMPLOYER_DRAFT_SCOPE,
  });

  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    onBusyChange(mutation.pending);
    return () => onBusyChange(false);
  }, [mutation.pending, onBusyChange]);

  const refresh = () => {
    members.retry();
    invitations.retry();
  };

  const handleOperationError = (error: unknown) => {
    toast.error(getApiErrorMessage(error));
  };

  const perform = (operation: () => Promise<unknown>) =>
    void mutation
      .run(async () => {
        try {
          await operation();
        } finally {
          refresh();
        }
      })
      .catch(handleOperationError);

  const handleRoleChange = (member: CompanyMember, value: string) => {
    perform(async () => {
      await api.updateCompanyMember(
        company.id,
        member.userId,
        value as TeamRole,
      );
      await onCompanyChange();
      toast.success('Роль изменена');
    });
  };

  const handleFormSubmit = (input: InvitationFormValues) => {
    perform(async () => {
      const invitation = await api.createCompanyInvitation(company.id, input);
      setCreated(invitation);
      form.reset({ email: '', role: 'recruiter' });
      markSaved();
      setInvitationOffset(0);
      toast.success('Приглашение создано');
    });
  };

  // Ссылка, по которой сотрудник принимает приглашение одним кликом.
  const invitationLink = created?.token
    ? `${window.location.origin}${STATIC_ROUTES.EMPLOYER_INVITATION}?token=${encodeURIComponent(created.token)}`
    : '';

  const handleCopyInvitation = () => {
    if (!invitationLink) return;

    void mutation
      .run(async () => {
        await navigator.clipboard.writeText(invitationLink);
        toast.success('Ссылка скопирована');
      })
      .catch(handleOperationError);
  };

  const handleRemove = (item: CompanyMember | CompanyInvitation) => {
    mutation.clearError();
    setRemove(item);
  };

  const handleCloseRemove = () => setRemove(null);

  const handleConfirmRemove = async (): Promise<boolean> => {
    if (!remove) return false;

    try {
      await mutation.run(async () => {
        try {
          if ('userId' in remove) {
            await api.disableCompanyMember(company.id, remove.userId);
          } else {
            await api.revokeCompanyInvitation(company.id, remove.id);
            if (created?.id === remove.id) setCreated(null);
          }
          await onCompanyChange();
        } finally {
          refresh();
        }
      });
      return true;
    } catch {
      return false;
    }
  };

  return {
    memberOffset,
    setMemberOffset,
    invitationOffset,
    setInvitationOffset,
    owner,
    members,
    invitations,
    mutation,
    created,
    remove,
    form,
    dirty,
    handleRoleChange,
    handleFormSubmit,
    handleCopyInvitation,
    invitationLink,
    handleRemove,
    handleCloseRemove,
    handleConfirmRemove,
  };
};
