export type AuthUnavailableDetails = {
  message: string;
  code: string;
  status: number;
  displayName?: string;
  retryAfter?: string;
};

export class AuthUnavailableError extends Error {
  readonly details: AuthUnavailableDetails;

  constructor(details: AuthUnavailableDetails) {
    super(details.message);
    this.name = 'AuthUnavailableError';
    this.details = details;
  }
}
