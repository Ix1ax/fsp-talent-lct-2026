export const CANDIDATE_ELEMENT_IDS = {
  profile: {
    headline: { input: 'profile-headline', error: 'profile-headline-error' },
    city: { input: 'profile-city', error: 'profile-city-error' },
    experienceYears: {
      input: 'profile-experienceYears',
      error: 'profile-experienceYears-error',
    },
    salaryMinRub: {
      input: 'profile-salaryMinRub',
      error: 'profile-salaryMinRub-error',
    },
    summary: { input: 'profile-summary', error: 'profile-summary-error' },
    timezone: { input: 'profile-timezone', error: 'profile-timezone-error' },
    searchStatus: {
      input: 'profile-search-status',
      error: 'profile-search-status-error',
    },
    workFormats: {
      hint: 'profile-work-formats-hint',
      error: 'profile-work-formats-error',
    },
  },
  contacts: {
    fullName: { input: 'contacts-fullName', error: 'contacts-fullName-error' },
    email: { input: 'contacts-email', error: 'contacts-email-error' },
    phone: { input: 'contacts-phone', error: 'contacts-phone-error' },
    telegram: { input: 'contacts-telegram', error: 'contacts-telegram-error' },
  },
  avatar: {
    section: 'candidate-avatar-section',
    input: 'candidate-avatar',
    hint: 'avatar-help',
    error: 'avatar-file-error',
    zoom: 'avatar-zoom',
    zoomLabel: 'avatar-zoom-label',
    rotation: 'avatar-rotation',
    rotationLabel: 'avatar-rotation-label',
  },
  skills: {
    name: 'candidate-skill-name',
    hint: 'candidate-skill-hint',
    level: 'candidate-skill-level',
  },
  consents: {
    section: 'consents',
    history: 'consent-history',
  },
} as const;
