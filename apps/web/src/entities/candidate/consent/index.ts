export type { GrantConsentInput, RevokeConsentInput } from './api';
export {
  getCandidateConsents,
  grantCandidateConsent,
  revokeCandidateConsent,
} from './api';
export type { CandidateConsent, CandidateConsents, ConsentKind } from './model';
export { getConsentPermissions, hasActiveConsent } from './model';
