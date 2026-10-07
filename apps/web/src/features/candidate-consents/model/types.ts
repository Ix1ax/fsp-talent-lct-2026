import type {
  CandidateConsents,
  RevokeConsentInput,
} from '@/entities/candidate-consent';

export type UseCandidateConsentsOptions = {
  consents: CandidateConsents;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onConsentsChange: (consents: CandidateConsents) => void;
  onRevoked: (input: RevokeConsentInput) => void;
  onRefreshProfile: (signal?: AbortSignal) => Promise<void>;
};

export type CandidateConsentsState = {
  history?: CandidateConsents;
  historyLoading: boolean;
  historyError: string;
  message: string;
  syncError: string;
  pending: boolean;
};

export const INITIAL_CONSENTS_STATE: CandidateConsentsState = {
  historyLoading: false,
  historyError: '',
  message: '',
  syncError: '',
  pending: false,
};
