export type FSPAchievement = {
  id: string;
  eventId: string;
  eventName: string;
  discipline: string;
  occurredOn: string;
  result: string;
  place: number | null;
  source: string;
};

export type FSPLink = {
  participantId: string;
  source: string;
  linkedAt: string;
  syncedAt: string | null;
  syncStatus: 'ready' | 'empty' | 'unavailable';
};

export type FSPProfile = {
  link: FSPLink | null;
  items: FSPAchievement[];
};
