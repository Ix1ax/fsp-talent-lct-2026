import { ensureClientAccessToken } from '@/shared/api';
import { ApiError } from '@/shared/api/errors';
import { toast } from '@/shared/ui';
import {
  getCandidateConsents,
  grantCandidateConsent,
  revokeCandidateConsent,
  type RevokeConsentInput,
} from '@/entities/candidate';

import {
  type CandidateConsentsState,
  INITIAL_CONSENTS_STATE,
  type UseCandidateConsentsOptions,
} from './types';

export const createConsentsController = (
  initialOptions: UseCandidateConsentsOptions,
  onStateChange: (state: CandidateConsentsState) => void,
) => {
  let options = initialOptions;
  let state = { ...INITIAL_CONSENTS_STATE };
  let mutating = false;
  let revision = 0;
  let refreshController: AbortController | undefined;
  let historyRequest: Promise<void> | undefined;

  const update = (patch: Partial<CandidateConsentsState>) => {
    state = { ...state, ...patch };
    onStateChange(state);
  };

  const reportError = (
    field: 'message' | 'historyError' | 'syncError',
    message: string,
  ) => {
    update({ [field]: message });
    toast.error(message);
  };

  const invalidateReads = () => {
    revision += 1;
    refreshController?.abort();
    historyRequest = undefined;
    update({ historyLoading: false });
    return revision;
  };

  const synchronize = async (requestRevision: number) => {
    const controller = new AbortController();
    refreshController = controller;
    await ensureClientAccessToken();
    if (revision !== requestRevision) return;
    await options.onRefreshProfile(controller.signal);
    if (revision !== requestRevision) return;
    const latest = await getCandidateConsents(controller.signal);
    if (revision !== requestRevision) return;
    options.onConsentsChange(latest);
    update({ history: latest, syncError: '' });
  };

  const loadHistory = (): Promise<void> => {
    if (options.busy || mutating) return Promise.resolve();
    if (historyRequest) return historyRequest;
    const requestRevision = invalidateReads();

    update({ historyLoading: true, historyError: '' });

    const request = synchronize(requestRevision)
      .catch(() => {
        if (revision !== requestRevision) return;
        reportError(
          'historyError',
          'Не удалось обновить профиль и историю согласий. Повторите загрузку.',
        );
      })
      .finally(() => {
        if (historyRequest !== request) return;
        update({ historyLoading: false });
        historyRequest = undefined;
      });

    historyRequest = request;
    return request;
  };

  const handleMutationError = async (
    error: unknown,
    requestRevision: number,
  ) => {
    if (error instanceof ApiError && error.code === 'policy_outdated') {
      try {
        await synchronize(requestRevision);
        reportError(
          'message',
          'Версия политики обновилась. Ознакомьтесь с новой версией и подтвердите согласие заново.',
        );
      } catch {
        reportError(
          'syncError',
          'Версия политики устарела. Не удалось загрузить новую версию. Повторите обновление данных.',
        );
      }
    } else if (
      error instanceof ApiError &&
      ['consent_exists', 'consent_not_found'].includes(error.code ?? '')
    ) {
      try {
        await synchronize(requestRevision);
        reportError(
          'message',
          'Состояние согласий уже изменилось. Данные обновлены, проверьте их.',
        );
      } catch {
        reportError(
          'syncError',
          'Состояние согласий изменилось. Повторите обновление данных.',
        );
      }
    } else {
      reportError(
        'message',
        'Не удалось изменить согласие. Попробуйте ещё раз.',
      );
    }
  };

  const mutate = async (
    action: () => Promise<() => void>,
    successMessage: string,
  ) => {
    if (options.busy || mutating) return false;
    mutating = true;

    const requestRevision = invalidateReads();
    update({ pending: true, message: '', historyError: '', syncError: '' });
    options.onBusyChange(true);

    try {
      let commit: () => void;
      try {
        commit = await action();
      } catch (error) {
        await handleMutationError(error, requestRevision);
        return false;
      }
      try {
        commit();
        await synchronize(requestRevision);
        toast.success(successMessage);
      } catch {
        reportError(
          'syncError',
          `${successMessage} Не удалось обновить данные. Повторите обновление данных.`,
        );
      }
      return true;
    } finally {
      mutating = false;
      update({ pending: false });
      options.onBusyChange(false);
    }
  };

  const grant = (kind: 'processing' | 'publication') =>
    mutate(async () => {
      const consent = await grantCandidateConsent({
        kind,
        policyVersion: options.consents.currentPolicyVersion,
      });
      return () =>
        options.onConsentsChange({
          ...options.consents,
          items: [consent, ...options.consents.items],
        });
    }, 'Согласие дано.');

  const revoke = (input: RevokeConsentInput) =>
    mutate(async () => {
      await revokeCandidateConsent(input);
      return () => options.onRevoked(input);
    }, 'Согласие отозвано.');

  return {
    grant,
    revoke,
    loadHistory,
    retrySync: loadHistory,
    setOptions: (next: UseCandidateConsentsOptions) => {
      options = next;
    },
  };
};
