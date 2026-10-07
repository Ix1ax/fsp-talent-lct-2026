import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api/errors';
import type {
  CandidateConsent,
  CandidateConsents,
} from '@/entities/candidate-consent';

import { createConsentsController } from '../createConsentsController';
import { type CandidateConsentsState, INITIAL_CONSENTS_STATE } from '../types';

const mocks = vi.hoisted(() => ({
  ensureToken: vi.fn(),
  getConsents: vi.fn(),
  grant: vi.fn(),
  revoke: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));
vi.mock('@/shared/api', () => ({ ensureClientAccessToken: mocks.ensureToken }));
vi.mock('@/shared/ui', () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));
vi.mock('@/entities/candidate-consent', () => ({
  getCandidateConsents: mocks.getConsents,
  grantCandidateConsent: mocks.grant,
  revokeCandidateConsent: mocks.revoke,
}));

const consent: CandidateConsent = {
  id: 'processing',
  kind: 'processing',
  policyVersion: 'v1',
  companyId: null,
  grantedAt: 'now',
  revokedAt: null,
};
const consents: CandidateConsents = {
  currentPolicyVersion: 'v1',
  items: [consent],
};

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};

const setup = () => {
  let state: CandidateConsentsState = { ...INITIAL_CONSENTS_STATE };
  const options = {
    consents,
    busy: false,
    onBusyChange: vi.fn(),
    onConsentsChange: vi.fn(),
    onRevoked: vi.fn(),
    onRefreshProfile: vi.fn<(signal?: AbortSignal) => Promise<void>>(
      async () => {},
    ),
  };
  const controller = createConsentsController(options, (next) => {
    state = next;
  });
  return { controller, options, getState: () => state };
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.ensureToken.mockResolvedValue('token');
  mocks.getConsents.mockResolvedValue(consents);
  mocks.grant.mockResolvedValue(consent);
  mocks.revoke.mockResolvedValue(undefined);
});

describe('consent request controller', () => {
  it('refreshes the full profile when history detects withdrawal in another tab', async () => {
    const { controller, options, getState } = setup();
    const revoked = {
      ...consents,
      items: [{ ...consent, revokedAt: 'revoked' }],
    };
    let visible = {
      searchStatus: 'open',
      contacts: { email: 'private@example.com' } as { email: string } | null,
    };
    options.onRefreshProfile.mockImplementation(async () => {
      visible = { searchStatus: 'hidden', contacts: null };
    });
    mocks.getConsents.mockResolvedValue(revoked);
    await controller.loadHistory();
    expect(visible).toEqual({ searchStatus: 'hidden', contacts: null });
    expect(options.onRefreshProfile).toHaveBeenCalledOnce();
    expect(options.onConsentsChange).toHaveBeenCalledWith(revoked);
    expect(getState().history).toEqual(revoked);
  });

  it('ignores an obsolete history failure after a successful grant', async () => {
    const { controller, getState } = setup();
    const old = deferred<CandidateConsents>();
    mocks.getConsents.mockImplementationOnce(() => old.promise);
    const reading = controller.loadHistory();
    await vi.waitFor(() => expect(mocks.getConsents).toHaveBeenCalledOnce());
    const oldSignal = mocks.getConsents.mock.calls[0][0] as AbortSignal;
    expect(await controller.grant('processing')).toBe(true);
    expect(oldSignal.aborted).toBe(true);
    old.reject(new Error('late error'));
    await reading;
    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(getState()).toMatchObject({
      history: consents,
      historyError: '',
      message: '',
      syncError: '',
      historyLoading: false,
    });
  });

  it('ignores an obsolete successful history response', async () => {
    const { controller, options, getState } = setup();
    const old = deferred<CandidateConsents>();
    mocks.getConsents.mockImplementationOnce(() => old.promise);
    const reading = controller.loadHistory();
    await vi.waitFor(() => expect(mocks.getConsents).toHaveBeenCalledOnce());
    await controller.grant('processing');
    old.resolve({ currentPolicyVersion: 'obsolete', items: [] });
    await reading;
    expect(getState().history?.currentPolicyVersion).toBe('v1');
    expect(options.onConsentsChange).not.toHaveBeenCalledWith({
      currentPolicyVersion: 'obsolete',
      items: [],
    });
  });

  it('aborts a pending profile refresh before mutation so it cannot commit old profile data', async () => {
    const { controller, options } = setup();
    const old = deferred<void>();
    let oldSignal: AbortSignal | undefined;
    let visibleStatus = 'open';
    options.onRefreshProfile.mockImplementationOnce(async (signal) => {
      oldSignal = signal;
      await old.promise;
      if (!signal?.aborted) visibleStatus = 'open';
    });
    const reading = controller.loadHistory();
    await vi.waitFor(() =>
      expect(options.onRefreshProfile).toHaveBeenCalledOnce(),
    );
    options.onRevoked.mockImplementation(() => {
      visibleStatus = 'hidden';
    });
    await controller.revoke({ kind: 'processing' });
    old.resolve();
    await reading;
    expect(oldSignal?.aborted).toBe(true);
    expect(visibleStatus).toBe('hidden');
  });

  it('retries both profile and history after successful mutation but failed synchronization', async () => {
    const { controller, options, getState } = setup();
    options.onRefreshProfile.mockRejectedValueOnce(
      new Error('profile offline'),
    );
    expect(await controller.revoke({ kind: 'processing' })).toBe(true);
    expect(options.onRevoked).toHaveBeenCalledWith({ kind: 'processing' });
    expect(getState().syncError).toContain('Повторите обновление данных');
    expect(mocks.getConsents).not.toHaveBeenCalled();
    await controller.retrySync();
    expect(options.onRefreshProfile).toHaveBeenCalledTimes(2);
    expect(mocks.getConsents).toHaveBeenCalledOnce();
    expect(getState()).toMatchObject({
      syncError: '',
      historyError: '',
      history: consents,
    });
    expect(mocks.revoke).toHaveBeenCalledOnce();
  });

  it('clears a history error after a successful repeat without changing mutation errors', async () => {
    const { controller, getState } = setup();
    mocks.grant.mockRejectedValueOnce(new Error('mutation failed'));
    await controller.grant('processing');
    const mutationMessage = getState().message;
    mocks.getConsents.mockRejectedValueOnce(new Error('history failed'));
    await controller.loadHistory();
    expect(getState().historyError).toContain('Не удалось');
    await controller.loadHistory();
    expect(getState().historyError).toBe('');
    expect(getState().message).toBe(mutationMessage);
  });

  it('deduplicates history loading and blocks duplicate mutations', async () => {
    const { controller } = setup();
    const read = deferred<CandidateConsents>();
    mocks.getConsents.mockImplementationOnce(() => read.promise);
    const first = controller.loadHistory();
    expect(controller.loadHistory()).toBe(first);
    read.resolve(consents);
    await first;
    const grant = deferred<CandidateConsent>();
    mocks.grant.mockImplementationOnce(() => grant.promise);
    const mutation = controller.grant('processing');
    expect(await controller.grant('processing')).toBe(false);
    grant.resolve(consent);
    await mutation;
    expect(mocks.grant).toHaveBeenCalledOnce();
  });

  it('refreshes an outdated policy without automatically granting consent again', async () => {
    const { controller, options, getState } = setup();
    mocks.grant.mockRejectedValueOnce(
      new ApiError(409, 'outdated', 'policy_outdated'),
    );
    const latest = { currentPolicyVersion: 'v2', items: [] };
    mocks.getConsents.mockResolvedValueOnce(latest);
    expect(await controller.grant('publication')).toBe(false);
    expect(options.onConsentsChange).toHaveBeenCalledWith(latest);
    expect(getState().message).toContain('подтвердите согласие заново');
    expect(mocks.grant).toHaveBeenCalledOnce();
  });
});
