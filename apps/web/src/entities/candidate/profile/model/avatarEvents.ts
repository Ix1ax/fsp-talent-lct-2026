export const CANDIDATE_AVATAR_UPDATED_EVENT = 'candidate-avatar-updated';

export const notifyCandidateAvatarUpdated = () => {
  if (typeof window !== 'undefined')
    window.dispatchEvent(new Event(CANDIDATE_AVATAR_UPDATED_EVENT));
};
